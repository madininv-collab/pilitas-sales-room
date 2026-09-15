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

const { buildConciergeContext } = await vite.ssrLoadModule("/lib/concierge/context/build-context.ts");
const { initialResidences, generalPlans } = await vite.ssrLoadModule("/lib/pilitas/catalog.ts");
const { createSalesRoomAdapter } = await vite.ssrLoadModule("/lib/concierge/adapters/sales-room-adapter.ts");
const { createConciergeEngine } = await vite.ssrLoadModule("/lib/concierge/engine.ts");
const { createPresentationDirector } = await vite.ssrLoadModule("/lib/concierge/director/presentation-director.ts");

function createDirectorHarness() {
  let state = {
    residences: initialResidences,
    selectedId: null,
    view: "front",
    exploring: false,
    inventoryOpen: false,
    interiorOpen: false,
    experienceView: "interior",
    selectedAmenityId: null,
    generalPlansOpen: false,
    generalPlanIndex: 0,
    totalGeneralPlans: generalPlans.length,
    language: "es",
    currency: "USD",
    mxnPerUsd: 17.0427,
    syncStatus: "synced",
    updatedAt: "2026-09-14T12:00:00.000Z",
  };

  const bridge = {
    getState: () => state,
    getContext: () => buildConciergeContext(state),
    selectResidence: (id) => { state.selectedId = id; state.exploring = true; },
    setFacade: (facade) => { state.view = facade; },
    openInventory: () => { state.inventoryOpen = true; },
    closeInventory: () => { state.inventoryOpen = false; },
    openFloorPlan: (id) => {
      state.selectedId = id;
      state.interiorOpen = true;
      state.experienceView = "plan";
      state.exploring = true;
    },
    closeExperience: () => { state.interiorOpen = false; },
    showAmenity: (amenityId) => {
      state.selectedAmenityId = amenityId;
      state.interiorOpen = true;
      state.experienceView = "interior";
    },
    openTour: (id) => {
      state.selectedId = id;
      state.interiorOpen = true;
      state.experienceView = "tour";
    },
    setLanguage: (lang) => { state.language = lang; },
    setCurrency: (curr) => { state.currency = curr; },
  };

  const spokenMessages = [];
  const mockSink = {
    speak: async (text) => {
      spokenMessages.push(text);
      return { completed: true, aborted: false };
    },
    stop: () => {},
  };

  const adapter = createSalesRoomAdapter(bridge);
  const engine = createConciergeEngine({ salesRoom: adapter });
  const director = createPresentationDirector({
    engine,
    narrationSink: mockSink,
  });

  return { bridge, adapter, engine, director, spokenMessages };
}

test("PresentationDirector executes guided tour step-by-step through all 6 steps", async () => {
  const { director, bridge, spokenMessages } = createDirectorHarness();

  // Step 0: Welcome
  const step0 = await director.start();
  assert.equal(step0?.id, "intro");
  assert.equal(director.getStatus().state, "presenting");
  assert.equal(director.getStatus().currentStepIndex, 0);

  // Step 1: Architecture
  const step1 = await director.nextStep();
  assert.equal(step1?.id, "architecture");
  assert.equal(director.getStatus().currentStepIndex, 1);

  // Step 2: Featured unit 401
  const step2 = await director.nextStep();
  assert.equal(step2?.id, "show_residence");
  assert.equal(bridge.getState().selectedId, "401");

  // Step 3: Floor plan
  const step3 = await director.nextStep();
  assert.equal(step3?.id, "show_plan");
  assert.equal(bridge.getState().experienceView, "plan");
  assert.equal(bridge.getState().interiorOpen, true);

  // Step 4: Rooftop amenity
  const step4 = await director.nextStep();
  assert.equal(step4?.id, "show_amenity_rooftop");
  assert.equal(bridge.getState().selectedAmenityId, "rooftop");

  // Step 5: Closing
  const step5 = await director.nextStep();
  assert.equal(step5?.id, "closing");

  // Step 6: Completes
  const stepAfter = await director.nextStep();
  assert.equal(stepAfter, null);
  assert.equal(director.getStatus().state, "completed");
  assert.equal(spokenMessages.length, 6);
});

test("PresentationDirector pauses automatically upon manual user navigation", async () => {
  const { director } = createDirectorHarness();

  await director.start();
  assert.equal(director.getStatus().state, "presenting");

  // User manually clicked on a residence or facade
  director.onManualNavigation();
  assert.equal(director.getStatus().state, "paused");
});

test("PresentationDirector handles chat interruption and resumes coherently", async () => {
  const { director } = createDirectorHarness();

  // Start tour (step 0: intro)
  await director.start();
  // Advance to step 2 (show_residence 401)
  await director.nextStep();
  await director.nextStep();
  assert.equal(director.getStatus().currentStepIndex, 2);

  // User asks a question in chat -> interrupts presentation
  director.interrupt();
  assert.equal(director.getStatus().state, "handling_interruption");

  // User asks to resume ("continúa la presentación")
  const resumedStep = await director.resume();
  assert.equal(director.getStatus().state, "presenting");
  assert.equal(resumedStep?.id, "show_residence");
  assert.equal(director.getStatus().resumedFromStepId, "show_residence");
});

test("PresentationDirector stops cleanly without leaving phantom pending actions", async () => {
  const { director } = createDirectorHarness();

  await director.start();
  director.stop();

  assert.equal(director.getStatus().state, "idle");
  assert.equal(director.getStatus().currentStepIndex, 0);
  assert.equal(director.getStatus().currentStep, null);
});
