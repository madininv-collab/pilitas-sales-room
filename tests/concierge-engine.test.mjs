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

function createTestHarness(initialOverrides = {}) {
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
    ...initialOverrides,
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

  const adapter = createSalesRoomAdapter(bridge);
  const engine = createConciergeEngine({ salesRoom: adapter });

  return { bridge, adapter, engine };
}

test("ConciergeEngine handles action command end-to-end", async () => {
  const { engine } = createTestHarness();

  const turn = await engine.handle({ text: "Muéstrame la 401" });
  assert.equal(turn.decision.kind, "action");
  assert.ok(turn.toolResult?.ok);
  assert.equal(turn.contextAfter.navigation.selectedResidenceId, "401");
  assert.equal(turn.contextAfter.navigation.activeFacade, "front");
});

test("ConciergeEngine handles commercial question without state mutation", async () => {
  const { engine } = createTestHarness({ selectedId: null });

  const turn = await engine.handle({ text: "¿Cuánto cuesta la 401?" });
  assert.equal(turn.decision.kind, "reply");
  assert.equal(turn.toolResult, undefined);
  assert.equal(turn.contextAfter.navigation.selectedResidenceId, null);
  assert.match(turn.decision.message, /Residencia 401/);
});

test("ConciergeEngine allows seamless substitution of interpretation provider", async () => {
  const { adapter } = createTestHarness();

  // Custom mock AI provider
  const mockAIProvider = {
    id: "mock_ai_agent",
    async interpret() {
      return {
        kind: "action",
        action: { type: "open_tour", residenceId: "401" },
        thought: "User wants to explore virtual reality tour for residence 401",
      };
    },
  };

  const customEngine = createConciergeEngine({
    provider: mockAIProvider,
    salesRoom: adapter,
  });

  const turn = await customEngine.handle({ text: "any random input" });
  assert.equal(turn.decision.kind, "action");
  assert.equal(turn.toolResult?.ok, true);
  assert.equal(turn.contextAfter.navigation.experienceModal.isOpen, true);
  assert.equal(turn.contextAfter.navigation.experienceModal.activeType, "tour");
});

test("ConciergeEngine respects AbortSignal and cancels execution", async () => {
  const { engine } = createTestHarness();
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    () => engine.handle({ text: "Muéstrame la 401", signal: controller.signal }),
    /aborted/i
  );
});
