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
const { executeTool } = await vite.ssrLoadModule("/lib/concierge/tools/execute.ts");
const { createSalesRoomAdapter } = await vite.ssrLoadModule("/lib/concierge/adapters/sales-room-adapter.ts");
const { TOOL_DESCRIPTORS } = await vite.ssrLoadModule("/lib/concierge/tools/registry.ts");

function createMockBridge(initialOverrides = {}) {
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
    selectResidence: (id) => {
      state.selectedId = id;
      state.selectedAmenityId = null;
      state.inventoryOpen = false;
      state.exploring = true;
    },
    setFacade: (facade) => {
      state.view = facade;
    },
    openInventory: () => {
      state.inventoryOpen = true;
    },
    closeInventory: () => {
      state.inventoryOpen = false;
    },
    openFloorPlan: (id) => {
      state.selectedId = id;
      state.selectedAmenityId = null;
      state.interiorOpen = true;
      state.experienceView = "plan";
      state.inventoryOpen = false;
      state.exploring = true;
    },
    closeExperience: () => {
      state.interiorOpen = false;
      state.selectedAmenityId = null;
    },
    showAmenity: (amenityId) => {
      state.selectedId = null;
      state.selectedAmenityId = amenityId;
      state.interiorOpen = true;
      state.experienceView = "interior";
      state.inventoryOpen = false;
      state.exploring = true;
    },
    openTour: (id) => {
      state.selectedId = id;
      state.selectedAmenityId = null;
      state.interiorOpen = true;
      state.experienceView = "tour";
      state.inventoryOpen = false;
      state.exploring = true;
    },
    setLanguage: (lang) => {
      state.language = lang;
    },
    setCurrency: (curr) => {
      state.currency = curr;
    },
  };

  return { bridge, adapter: createSalesRoomAdapter(bridge) };
}

test("Tool registry contains all 22 expected tools with valid parameters", () => {
  assert.equal(TOOL_DESCRIPTORS.length, 22);
  const toolNames = TOOL_DESCRIPTORS.map((t) => t.name);
  assert.ok(toolNames.includes("select_residence"));
  assert.ok(toolNames.includes("set_facade"));
  assert.ok(toolNames.includes("open_inventory"));
  assert.ok(toolNames.includes("close_inventory"));
  assert.ok(toolNames.includes("open_floor_plan"));
  assert.ok(toolNames.includes("close_floor_plan"));
  assert.ok(toolNames.includes("set_plan_view"));
  assert.ok(toolNames.includes("show_amenity"));
  assert.ok(toolNames.includes("close_amenity"));
  assert.ok(toolNames.includes("open_tour"));
  assert.ok(toolNames.includes("close_tour"));
  assert.ok(toolNames.includes("open_map"));
  assert.ok(toolNames.includes("close_map"));
  assert.ok(toolNames.includes("open_general_plans"));
  assert.ok(toolNames.includes("set_general_plan_index"));
  assert.ok(toolNames.includes("close_general_plans"));
  assert.ok(toolNames.includes("open_interior_gallery"));
  assert.ok(toolNames.includes("set_gallery_index"));
  assert.ok(toolNames.includes("set_highlight"));
  assert.ok(toolNames.includes("clear_highlight"));
  assert.ok(toolNames.includes("set_language"));
  assert.ok(toolNames.includes("set_currency"));
});

test("executeTool rejects invalid arguments or unknown actions without executing", async () => {
  const { adapter } = createMockBridge();
  const context = adapter.getContext();

  // Malformed type
  const badType = await executeTool({ type: "destroy_building" }, context, adapter);
  assert.equal(badType.ok, false);
  assert.equal(badType.code, "INVALID_ARGUMENTS");

  // Invalid residence ID
  const badId = await executeTool({ type: "select_residence", residenceId: "999" }, context, adapter);
  assert.equal(badId.ok, false);
  assert.equal(badId.code, "INVALID_ARGUMENTS");

  // Missing required parameters
  const missingParam = await executeTool({ type: "select_residence" }, context, adapter);
  assert.equal(missingParam.ok, false);
  assert.equal(missingParam.code, "INVALID_ARGUMENTS");
});

test("executeTool enforces preconditions: tour availability", async () => {
  const { adapter } = createMockBridge();
  const context = adapter.getContext();

  // Unit 203 exists in inventory but has NO virtual tour
  const noTour = await executeTool({ type: "open_tour", residenceId: "203" }, context, adapter);
  assert.equal(noTour.ok, false);
  assert.equal(noTour.code, "NOT_AVAILABLE");

  // Unit 401 has a virtual tour
  const hasTour = await executeTool({ type: "open_tour", residenceId: "401" }, context, adapter);
  assert.equal(hasTour.ok, true);
  if (hasTour.ok) {
    assert.equal(hasTour.contextAfter.navigation.experienceModal.isOpen, true);
    assert.equal(hasTour.contextAfter.navigation.experienceModal.activeType, "tour");
    assert.equal(hasTour.contextAfter.navigation.experienceModal.targetId, "401");
  }
});

test("executeTool automatically switches facade if requested unit is on opposite facade", async () => {
  // Start on front facade
  const { adapter } = createMockBridge({ view: "front" });
  const context = adapter.getContext();
  assert.equal(context.navigation.activeFacade, "front");

  // Unit 204 only exists on rear facade
  const result = await executeTool({ type: "select_residence", residenceId: "204" }, context, adapter);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.contextAfter.navigation.activeFacade, "rear");
    assert.equal(result.contextAfter.navigation.selectedResidenceId, "204");
  }
});

test("set_facade is idempotent when called on the active facade and preserves selection", async () => {
  // Start on front with 401 selected
  const { adapter } = createMockBridge({ view: "front", selectedId: "401" });
  const context = adapter.getContext();

  const result = await executeTool({ type: "set_facade", facade: "front" }, context, adapter);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.contextAfter.navigation.activeFacade, "front");
    assert.equal(result.contextAfter.navigation.selectedResidenceId, "401");
  }
});

test("close_floor_plan does NOT close an amenity or virtual tour modal", async () => {
  // Case A: Amenity is open
  const { adapter: adapterA } = createMockBridge({
    interiorOpen: true,
    experienceView: "interior",
    selectedAmenityId: "rooftop",
  });
  const contextA = adapterA.getContext();
  assert.equal(contextA.navigation.experienceModal.activeType, "amenity");

  const closeAmenityTest = await executeTool({ type: "close_floor_plan" }, contextA, adapterA);
  assert.equal(closeAmenityTest.ok, true);
  if (closeAmenityTest.ok) {
    // Should NOT have closed the amenity modal!
    assert.equal(closeAmenityTest.contextAfter.navigation.experienceModal.isOpen, true);
    assert.equal(closeAmenityTest.contextAfter.navigation.experienceModal.activeType, "amenity");
  }

  // Case B: Plan is open
  const { adapter: adapterB } = createMockBridge({
    interiorOpen: true,
    experienceView: "plan",
    selectedId: "302",
  });
  const contextB = adapterB.getContext();
  assert.equal(contextB.navigation.experienceModal.activeType, "plan");

  const closePlanTest = await executeTool({ type: "close_floor_plan" }, contextB, adapterB);
  assert.equal(closePlanTest.ok, true);
  if (closePlanTest.ok) {
    // Plan IS closed
    assert.equal(closePlanTest.contextAfter.navigation.experienceModal.isOpen, false);
    assert.equal(closePlanTest.contextAfter.navigation.experienceModal.activeType, null);
  }
});
