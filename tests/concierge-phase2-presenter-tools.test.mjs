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
  PILITAS_PRESENTATION_SCRIPT,
} = await vite.ssrLoadModule("/lib/concierge/index.ts");

const {
  createInitialConversationState,
  recordUnitShown,
  recordAmenityConsulted,
  recordFloorPlanOpened,
  recordTourOpened,
  recordInterruption,
  clearInterruptionBookmark,
  updatePreferences,
} = await vite.ssrLoadModule("/lib/concierge/state/index.ts");

const { initialResidences } = await vite.ssrLoadModule("/lib/pilitas/catalog.ts");

function createMockBridge(overrides = {}) {
  const mockState = {
    selectedId: null,
    view: "front",
    exploring: false,
    inventoryOpen: false,
    mapOpen: false,
    interiorOpen: false,
    experienceView: "interior",
    selectedAmenityId: null,
    generalPlansOpen: false,
    generalPlanIndex: 0,
    totalGeneralPlans: 5,
    planView: "color",
    galleryIndex: 0,
    totalGalleryImages: 4,
    activeHighlight: null,
    isTyping: false,
    language: "es",
    currency: "USD",
    mxnPerUsd: 17.0427,
    syncStatus: "synced",
    updatedAt: "2026-09-15T12:00:00.000Z",
    ...overrides,
  };

  const calls = [];

  const bridge = {
    getContext: () =>
      buildConciergeContext({
        residences: initialResidences,
        ...mockState,
      }),
    selectResidence: (id) => {
      calls.push({ type: "selectResidence", id });
      mockState.selectedId = id;
      mockState.exploring = true;
      mockState.inventoryOpen = false;
    },
    setFacade: (facade) => {
      calls.push({ type: "setFacade", facade });
      mockState.view = facade;
    },
    openInventory: () => {
      calls.push({ type: "openInventory" });
      mockState.inventoryOpen = true;
    },
    closeInventory: () => {
      calls.push({ type: "closeInventory" });
      mockState.inventoryOpen = false;
    },
    openFloorPlan: (id, view) => {
      calls.push({ type: "openFloorPlan", id, view });
      mockState.selectedId = id;
      mockState.interiorOpen = true;
      mockState.experienceView = "plan";
      mockState.planView = view || "color";
    },
    closeExperience: () => {
      calls.push({ type: "closeExperience" });
      mockState.interiorOpen = false;
    },
    showAmenity: (id) => {
      calls.push({ type: "showAmenity", id });
      mockState.selectedAmenityId = id;
      mockState.interiorOpen = true;
      mockState.experienceView = "amenity";
    },
    closeAmenity: () => {
      calls.push({ type: "closeAmenity" });
      mockState.selectedAmenityId = null;
      mockState.interiorOpen = false;
    },
    openTour: (id) => {
      calls.push({ type: "openTour", id });
      mockState.selectedId = id;
      mockState.interiorOpen = true;
      mockState.experienceView = "tour";
    },
    closeTour: () => {
      calls.push({ type: "closeTour" });
      mockState.interiorOpen = false;
    },
    openMap: () => {
      calls.push({ type: "openMap" });
      mockState.mapOpen = true;
    },
    closeMap: () => {
      calls.push({ type: "closeMap" });
      mockState.mapOpen = false;
    },
    openGeneralPlans: (index) => {
      calls.push({ type: "openGeneralPlans", index });
      mockState.generalPlansOpen = true;
      mockState.generalPlanIndex = index ?? 0;
    },
    setGeneralPlanIndex: (index) => {
      calls.push({ type: "setGeneralPlanIndex", index });
      mockState.generalPlanIndex = index;
    },
    closeGeneralPlans: () => {
      calls.push({ type: "closeGeneralPlans" });
      mockState.generalPlansOpen = false;
    },
    setPlanView: (view) => {
      calls.push({ type: "setPlanView", view });
      mockState.planView = view;
    },
    openInteriorGallery: (id, index) => {
      calls.push({ type: "openInteriorGallery", id, index });
      mockState.selectedId = id;
      mockState.interiorOpen = true;
      mockState.experienceView = "interior";
      mockState.galleryIndex = index ?? 0;
    },
    setGalleryIndex: (index) => {
      calls.push({ type: "setGalleryIndex", index });
      mockState.galleryIndex = index;
    },
    setHighlight: (h) => {
      calls.push({ type: "setHighlight", highlight: h });
      mockState.activeHighlight = h;
    },
    clearHighlight: () => {
      calls.push({ type: "clearHighlight" });
      mockState.activeHighlight = null;
    },
    setLanguage: (l) => {
      calls.push({ type: "setLanguage", language: l });
      mockState.language = l;
    },
    setCurrency: (c) => {
      calls.push({ type: "setCurrency", currency: c });
      mockState.currency = c;
    },
  };

  return { bridge, calls, adapter: createSalesRoomAdapter(bridge) };
}

test("Extended SalesRoomAdapter handles map open and close", async () => {
  const { adapter, calls } = createMockBridge();

  const openMapResult = await adapter.execute({ type: "open_map" });
  assert.equal(openMapResult.ok, true);
  assert.equal(openMapResult.contextAfter.navigation.mapOpen, true);
  assert.equal(calls[0].type, "openMap");

  const closeMapResult = await adapter.execute({ type: "close_map" });
  assert.equal(closeMapResult.ok, true);
  assert.equal(closeMapResult.contextAfter.navigation.mapOpen, false);
  assert.equal(calls[1].type, "closeMap");
});

test("Extended SalesRoomAdapter handles general plans navigation", async () => {
  const { adapter, calls } = createMockBridge();

  const openResult = await adapter.execute({ type: "open_general_plans", index: 2 });
  assert.equal(openResult.ok, true);
  assert.equal(openResult.contextAfter.navigation.generalPlans.isOpen, true);
  assert.equal(openResult.contextAfter.navigation.generalPlans.activeIndex, 2);
  assert.equal(calls[0].type, "openGeneralPlans");

  const setIndexResult = await adapter.execute({ type: "set_general_plan_index", index: 3 });
  assert.equal(setIndexResult.ok, true);
  assert.equal(setIndexResult.contextAfter.navigation.generalPlans.activeIndex, 3);
  assert.equal(calls[1].type, "setGeneralPlanIndex");

  const closeResult = await adapter.execute({ type: "close_general_plans" });
  assert.equal(closeResult.ok, true);
  assert.equal(closeResult.contextAfter.navigation.generalPlans.isOpen, false);
  assert.equal(calls[2].type, "closeGeneralPlans");
});

test("Extended SalesRoomAdapter handles floor plan views and highlights", async () => {
  const { adapter, calls } = createMockBridge();

  // First open floor plan for unit 401
  const openPlanResult = await adapter.execute({ type: "open_floor_plan", residenceId: "401" });
  assert.equal(openPlanResult.ok, true);

  // Switch plan view mode
  const planViewResult = await adapter.execute({ type: "set_plan_view", view: "dimensions" });
  assert.equal(planViewResult.ok, true);
  assert.equal(planViewResult.contextAfter.navigation.experienceModal.planView, "dimensions");
  assert.equal(calls.some((c) => c.type === "setPlanView" && c.view === "dimensions"), true);

  // Set highlight on residence
  const highlightResResult = await adapter.execute({
    type: "set_highlight",
    targetType: "residence",
    targetId: "401",
    label: "Residencia 401",
  });
  assert.equal(highlightResResult.ok, true);
  assert.equal(highlightResResult.contextAfter.navigation.activeHighlight?.targetId, "401");
  assert.equal(highlightResResult.contextAfter.navigation.activeHighlight?.targetType, "residence");

  // Clear highlight
  const clearResult = await adapter.execute({ type: "clear_highlight" });
  assert.equal(clearResult.ok, true);
  assert.equal(clearResult.contextAfter.navigation.activeHighlight, null);
});

test("Extended SalesRoomAdapter handles query tools (list_units, get_unit_details, get_project_info)", async () => {
  const { adapter } = createMockBridge();

  // Query 2-bedroom available units
  const listResult = await adapter.execute({
    type: "list_units",
    beds: 2,
    status: "Disponible",
  });
  assert.equal(listResult.ok, true);
  assert.ok(Array.isArray(listResult.data));
  assert.ok(listResult.data.length > 0);
  assert.ok(listResult.data.every((u) => u.beds === 2 && u.status === "Disponible"));

  // Query unit details
  const detailsResult = await adapter.execute({
    type: "get_unit_details",
    residenceId: "501",
  });
  assert.equal(detailsResult.ok, true);
  assert.equal(detailsResult.data.id, "501");
  assert.equal(detailsResult.data.beds, 2);

  // Request human handoff
  const handoffResult = await adapter.execute({
    type: "request_human_handoff",
    reason: "Interesado en esquema de pagos de preventa",
    preferredChannel: "whatsapp",
  });
  assert.equal(handoffResult.ok, true);
  assert.equal(handoffResult.data.requested, true);
});

test("PresentationDirector executes script with contextual highlight actions", async () => {
  const { adapter, calls } = createMockBridge();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  const narratedTexts = [];
  const sink = {
    speak: async (text) => {
      narratedTexts.push(text);
      return { completed: true, aborted: false };
    },
    stop: () => {},
  };

  const director = createPresentationDirector({
    engine,
    script: PILITAS_PRESENTATION_SCRIPT,
    narrationSink: sink,
    autoAdvance: false, // manual progression for unit test
  });

  // Start tour (step 0: intro)
  const step0 = await director.start();
  assert.equal(step0?.id, "intro");
  assert.equal(director.getStatus().state, "presenting");
  assert.equal(director.getStatus().currentStepIndex, 0);

  // Next step (step 1: architecture)
  const step1 = await director.nextStep();
  assert.equal(step1?.id, "architecture");
  assert.equal(director.getStatus().currentStepIndex, 1);

  // Next step (step 2: show_residence with highlight on 401)
  const step2 = await director.nextStep();
  assert.equal(step2?.id, "show_residence");
  assert.equal(director.getStatus().currentStepIndex, 2);
  const highlightCall = calls.find((c) => c.type === "setHighlight" && c.highlight.targetId === "401");
  assert.ok(highlightCall, "Should have called setHighlight with targetId 401");

  // Interruption test
  director.interrupt();
  assert.equal(director.getStatus().state, "handling_interruption");

  // Resume test
  const resumedStep = await director.resume();
  assert.equal(director.getStatus().state, "presenting");
  assert.equal(resumedStep?.id, "show_residence");

  // Manual navigation pause
  director.onManualNavigation();
  assert.equal(director.getStatus().state, "paused");

  // Stop tour
  director.stop();
  assert.equal(director.getStatus().state, "idle");
});

test("Conversation state manager records preferences, engagement, and interruptions", () => {
  let state = createInitialConversationState("es", "USD");

  assert.equal(state.visitorPreferences.language, "es");
  assert.equal(state.engagement.purchaseIntentScore, "low");

  state = updatePreferences(state, {
    bedrooms: 2,
    intent: "vacation_home",
    budgetMaxUsd: 450000,
  });
  assert.equal(state.visitorPreferences.bedrooms, 2);
  assert.equal(state.visitorPreferences.intent, "vacation_home");

  state = recordUnitShown(state, "501");
  state = recordFloorPlanOpened(state, "501");
  state = recordAmenityConsulted(state, "rooftop");
  state = recordTourOpened(state, "301");

  assert.deepEqual(state.engagement.unitsShown, ["501"]);
  assert.deepEqual(state.engagement.floorPlansOpened, ["501"]);
  assert.deepEqual(state.engagement.amenitiesConsulted, ["rooftop"]);
  assert.deepEqual(state.engagement.toursOpened, ["301"]);
  assert.equal(state.engagement.purchaseIntentScore, "medium");

  // Record interruption bookmark
  state = recordInterruption(state, "show_plan", 3, "¿Cuánto cuesta el mantenimiento?");
  assert.equal(state.presentationProgress.pausedAtStepId, "show_plan");
  assert.equal(state.presentationProgress.interruptionBookmark?.stepId, "show_plan");
  assert.equal(state.presentationProgress.interruptionHistory.length, 1);

  // Clear bookmark on clean resume
  state = clearInterruptionBookmark(state);
  assert.equal(state.presentationProgress.interruptionBookmark, null);
});
