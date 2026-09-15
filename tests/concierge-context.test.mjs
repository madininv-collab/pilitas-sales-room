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

function createSampleParams(overrides = {}) {
  return {
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
    ...overrides,
  };
}

test("buildConciergeContext produces a faithful snapshot with valid schemaVersion", () => {
  const params = createSampleParams();
  const context = buildConciergeContext(params);

  assert.equal(context.schemaVersion, "1.0.0");
  assert.equal(context.project.id, "pilitas");
  assert.equal(context.project.language, "es");
  assert.equal(context.project.currency, "USD");
  assert.equal(context.project.mode, "presentation");
  assert.equal(context.project.exchangeRate.mxnPerUsd, 17.0427);
  assert.equal(context.project.exchangeRate.source, "fixed_catalog");
  assert.equal(context.navigation.activeFacade, "front");
  assert.equal(context.navigation.selectedResidenceId, null);
  assert.equal(context.navigation.experienceModal.isOpen, false);
  assert.equal(context.inventory.syncStatus, "synced");
  assert.equal(context.inventory.isUsingLocalBackup, false);
  assert.equal(context.inventory.residences.length, 16);
});

test("buildConciergeContext enforces deep immutability", () => {
  const context = buildConciergeContext(createSampleParams());

  assert.ok(Object.isFrozen(context), "Root context should be frozen");
  assert.ok(Object.isFrozen(context.project), "context.project should be frozen");
  assert.ok(Object.isFrozen(context.navigation), "context.navigation should be frozen");
  assert.ok(Object.isFrozen(context.inventory.residences), "residences array should be frozen");
  assert.ok(Object.isFrozen(context.inventory.residences[0]), "residence item should be frozen");

  assert.throws(() => {
    // @ts-expect-error test mutation rejection
    context.project.mode = "exploring";
  }, TypeError);

  assert.throws(() => {
    // @ts-expect-error test mutation rejection
    context.inventory.residences[0].status = "Vendida";
  }, TypeError);
});

test("buildConciergeContext is JSON serializable and safe for network or worker boundaries", () => {
  const context = buildConciergeContext(createSampleParams());
  const serialized = JSON.stringify(context);
  const deserialized = JSON.parse(serialized);

  assert.equal(deserialized.schemaVersion, "1.0.0");
  assert.equal(deserialized.project.name, "Las Verandas de Olas Altas");
  assert.equal(deserialized.inventory.residences.length, 16);
});

test("buildConciergeContext accurately tracks navigation and experience modal states", () => {
  // Case A: Unit 401 selected, plan opened
  const planContext = buildConciergeContext(
    createSampleParams({
      selectedId: "401",
      interiorOpen: true,
      experienceView: "plan",
      exploring: true,
    })
  );

  assert.equal(planContext.navigation.selectedResidenceId, "401");
  assert.equal(planContext.navigation.experienceModal.isOpen, true);
  assert.equal(planContext.navigation.experienceModal.activeType, "plan");
  assert.equal(planContext.navigation.experienceModal.targetId, "401");

  // Case B: Amenity rooftop opened
  const amenityContext = buildConciergeContext(
    createSampleParams({
      selectedAmenityId: "rooftop",
      interiorOpen: true,
      experienceView: "interior",
      exploring: true,
    })
  );

  assert.equal(amenityContext.navigation.selectedAmenityId, "rooftop");
  assert.equal(amenityContext.navigation.experienceModal.isOpen, true);
  assert.equal(amenityContext.navigation.experienceModal.activeType, "amenity");
  assert.equal(amenityContext.navigation.experienceModal.targetId, "rooftop");
});

test("buildConciergeContext correctly classifies tour availability and unit facades", () => {
  const context = buildConciergeContext(createSampleParams());

  const unit401 = context.inventory.residences.find((u) => u.id === "401");
  const unit203 = context.inventory.residences.find((u) => u.id === "203");
  const unit204 = context.inventory.residences.find((u) => u.id === "204");

  assert.ok(unit401, "Unit 401 must exist");
  assert.ok(unit203, "Unit 203 must exist");
  assert.ok(unit204, "Unit 204 must exist");

  // Unit 401 has tour and is on front facade
  assert.equal(unit401.facade, "front");
  assert.equal(unit401.hasTour, true);

  // Unit 203 does NOT have a virtual tour
  assert.equal(unit203.hasTour, false);

  // Unit 204 is on rear facade and has a virtual tour
  assert.equal(unit204.facade, "rear");
  assert.equal(unit204.hasTour, true);

  // Capabilities lists supported tools and available tours
  assert.ok(context.capabilities.supportedTools.includes("select_residence"));
  assert.ok(context.capabilities.supportedTools.includes("open_floor_plan"));
  assert.ok(context.capabilities.availableTours.includes("401"));
  assert.ok(!context.capabilities.availableTours.includes("203"));
});
