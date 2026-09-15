import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());

const {
  buildConciergeContext,
  createSalesRoomAdapter,
  createConciergeEngine,
  createPresentationDirector,
  localParserProvider,
  PILITAS_LOCAL_DEMO_SCRIPT,
} = await vite.ssrLoadModule("/lib/concierge/index.ts");

const { initialResidences } = await vite.ssrLoadModule("/lib/pilitas/catalog.ts");

function createMockBridge(inventoryOverrides = []) {
  const residences = inventoryOverrides.length > 0 ? inventoryOverrides : initialResidences;
  let selectedId = null;
  let view = "front";
  let interiorOpen = false;
  let experienceView = "interior";
  let activeHighlight = null;

  const bridge = {
    getContext: () =>
      buildConciergeContext({
        residences,
        selectedId,
        view,
        exploring: false,
        inventoryOpen: false,
        mapOpen: false,
        interiorOpen,
        experienceView,
        selectedAmenityId: null,
        generalPlansOpen: false,
        generalPlanIndex: 0,
        totalGeneralPlans: 5,
        planView: "color",
        galleryIndex: 0,
        totalGalleryImages: 4,
        activeHighlight,
        language: "es",
        currency: "USD",
        mxnPerUsd: 17.0427,
        syncStatus: "synced",
        updatedAt: null,
      }),
    selectResidence: (id) => {
      selectedId = id;
    },
    setFacade: (f) => {
      view = f;
    },
    openInventory: () => {},
    closeInventory: () => {},
    openFloorPlan: (id) => {
      selectedId = id;
      interiorOpen = true;
      experienceView = "plan";
    },
    closeExperience: () => {
      interiorOpen = false;
    },
    showAmenity: () => {
      interiorOpen = true;
    },
    closeAmenity: () => {
      interiorOpen = false;
    },
    openTour: () => {
      interiorOpen = true;
    },
    closeTour: () => {
      interiorOpen = false;
    },
    openMap: () => {},
    closeMap: () => {},
    openGeneralPlans: () => {},
    setGeneralPlanIndex: () => {},
    closeGeneralPlans: () => {},
    setPlanView: () => {},
    openInteriorGallery: () => {},
    setGalleryIndex: () => {},
    setHighlight: (h) => {
      activeHighlight = h;
    },
    clearHighlight: () => {
      activeHighlight = null;
    },
    setLanguage: () => {},
    setCurrency: () => {},
  };

  return { bridge, adapter: createSalesRoomAdapter(bridge) };
}

test("PresentationDirector waits for active voice narration before advancing", async () => {
  const { adapter } = createMockBridge();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  let narrationCompleted = false;
  let speechDurationMs = 60; // simulated speech duration

  const voiceSink = {
    speak: async (text, signal) => {
      narrationCompleted = false;
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          narrationCompleted = true;
          resolve({ completed: true, aborted: false });
        }, speechDurationMs);

        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve({ completed: false, aborted: true });
        });
      });
    },
    stop: () => {},
  };

  const director = createPresentationDirector({
    engine,
    script: PILITAS_LOCAL_DEMO_SCRIPT,
    narrationSink: voiceSink,
    autoAdvance: false, // controlled manual nextStep
  });

  const step0 = await director.start();
  assert.equal(step0?.id, "intro");
  // The speak promise was awaited and finished before start() resolved
  assert.equal(narrationCompleted, true);

  director.stop();
});

test("Interrupting presentation cancels voice speech immediately without overlap", async () => {
  const { adapter } = createMockBridge();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  let stoppedCalled = false;
  let speechStarted = false;
  let speechAborted = false;

  const voiceSink = {
    speak: async (text, signal) => {
      speechStarted = true;
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve({ completed: true, aborted: false });
        }, 5000); // 5s speech

        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          speechAborted = true;
          resolve({ completed: false, aborted: true });
        });
      });
    },
    stop: () => {
      stoppedCalled = true;
    },
  };

  const director = createPresentationDirector({
    engine,
    script: PILITAS_LOCAL_DEMO_SCRIPT,
    narrationSink: voiceSink,
    autoAdvance: false,
  });

  // Start step in background
  const stepPromise = director.start();

  // Wait until speech is actively running
  while (!speechStarted) {
    await new Promise((r) => setTimeout(r, 5));
  }

  // Interrupt while speaking!
  director.interrupt();

  await stepPromise;

  assert.equal(stoppedCalled, true);
  assert.equal(speechAborted, true);
  assert.equal(director.getStatus().state, "handling_interruption");

  director.stop();
});

test("PresentationDirector adapts narration if unit 401 is Vendida or Apartada", async () => {
  const soldResidences = initialResidences.map((u) =>
    u.id === "401" ? { ...u, status: "Vendida" } : u
  );

  const { adapter } = createMockBridge(soldResidences);
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  let spokenText = "";
  const sink = {
    speak: async (text) => {
      spokenText = text;
      return { completed: true, aborted: false };
    },
    stop: () => {},
  };

  const director = createPresentationDirector({
    engine,
    script: PILITAS_LOCAL_DEMO_SCRIPT,
    narrationSink: sink,
    autoAdvance: false,
  });

  await director.start(); // step 0 (intro)
  await director.nextStep(); // step 1 (architecture)
  await director.nextStep(); // step 2 (show_residence 401)

  // Spoken text must NOT say available; it must state that 401 is already sold
  assert.ok(spokenText.includes("ya fue vendida"), `Expected 'ya fue vendida' in: "${spokenText}"`);
  assert.ok(!spokenText.includes("disponible en preventa"), "Must NOT claim sold unit is available");

  director.stop();
});
