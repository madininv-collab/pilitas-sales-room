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
const { localParserProvider } = await vite.ssrLoadModule("/lib/concierge/providers/local-parser.ts");
const { TOOL_DESCRIPTORS } = await vite.ssrLoadModule("/lib/concierge/tools/registry.ts");

function getSampleContext(overrides = {}) {
  return buildConciergeContext({
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
  });
}

async function parse(text, ctx = getSampleContext()) {
  return localParserProvider.interpret({
    text,
    context: ctx,
    tools: TOOL_DESCRIPTORS,
  });
}

test("LocalParser interprets navigation and selection commands", async () => {
  const d1 = await parse("Muéstrame la 401");
  assert.equal(d1.kind, "action");
  if (d1.kind === "action") {
    assert.deepEqual(d1.action, { type: "select_residence", residenceId: "401" });
  }

  const d2 = await parse("Ver residencia 204");
  assert.equal(d2.kind, "action");
  if (d2.kind === "action") {
    assert.deepEqual(d2.action, { type: "select_residence", residenceId: "204" });
  }

  const d3 = await parse("Show me PH1");
  assert.equal(d3.kind, "action");
  if (d3.kind === "action") {
    assert.deepEqual(d3.action, { type: "select_residence", residenceId: "PH1" });
  }
});

test("LocalParser interprets floor plan and virtual tour actions", async () => {
  const plan = await parse("Muéstrame el plano de la 201");
  assert.equal(plan.kind, "action");
  if (plan.kind === "action") {
    assert.deepEqual(plan.action, { type: "open_floor_plan", residenceId: "201" });
  }

  const closePlan = await parse("Cierra el plano");
  assert.equal(closePlan.kind, "action");
  if (closePlan.kind === "action") {
    assert.deepEqual(closePlan.action, { type: "close_floor_plan" });
  }

  const tour = await parse("Abre el tour de la 401");
  assert.equal(tour.kind, "action");
  if (tour.kind === "action") {
    assert.deepEqual(tour.action, { type: "open_tour", residenceId: "401" });
  }
});

test("LocalParser interprets inventory, facade, and amenities", async () => {
  const openInv = await parse("Abre el inventario");
  assert.equal(openInv.kind, "action");
  if (openInv.kind === "action") {
    assert.deepEqual(openInv.action, { type: "open_inventory" });
  }

  const closeInv = await parse("Cierra el inventario");
  assert.equal(closeInv.kind, "action");
  if (closeInv.kind === "action") {
    assert.deepEqual(closeInv.action, { type: "close_inventory" });
  }

  const rearFacade = await parse("Cambia a la fachada posterior");
  assert.equal(rearFacade.kind, "action");
  if (rearFacade.kind === "action") {
    assert.deepEqual(rearFacade.action, { type: "set_facade", facade: "rear" });
  }

  const rooftop = await parse("Enséñame el rooftop");
  assert.equal(rooftop.kind, "action");
  if (rooftop.kind === "action") {
    assert.deepEqual(rooftop.action, { type: "show_amenity", amenityId: "rooftop" });
  }

  const lobby = await parse("Enséñame el lobby");
  assert.equal(lobby.kind, "action");
  if (lobby.kind === "action") {
    assert.deepEqual(lobby.action, { type: "show_amenity", amenityId: "lobby" });
  }
});

test("LocalParser interprets language and currency controls", async () => {
  const usd = await parse("Cambia a dólares");
  assert.equal(usd.kind, "action");
  if (usd.kind === "action") {
    assert.deepEqual(usd.action, { type: "set_currency", currency: "USD" });
  }

  const mxn = await parse("Cambia a pesos");
  assert.equal(mxn.kind, "action");
  if (mxn.kind === "action") {
    assert.deepEqual(mxn.action, { type: "set_currency", currency: "MXN" });
  }

  const en = await parse("Ponlo en inglés");
  assert.equal(en.kind, "action");
  if (en.kind === "action") {
    assert.deepEqual(en.action, { type: "set_language", language: "en" });
  }

  const es = await parse("Ponlo en español");
  assert.equal(es.kind, "action");
  if (es.kind === "action") {
    assert.deepEqual(es.action, { type: "set_language", language: "es" });
  }
});

test("LocalParser conservative rules: isolated numbers, negations, and ambiguities", async () => {
  // Isolated number does NOT select
  const isolated = await parse("401");
  assert.equal(isolated.kind, "clarification");

  // Negation does NOT execute
  const neg = await parse("No abras el inventario");
  assert.equal(neg.kind, "reply");
  assert.match(neg.message, /no realizaré ninguna acción/i);

  // Ambiguity: 401 o 201
  const multiUnits = await parse("Muéstrame la 401 o la 201");
  assert.equal(multiUnits.kind, "clarification");

  // Conflicting multiple actions
  const multiActions = await parse("Abre el plano y cambia a dólares");
  assert.equal(multiActions.kind, "clarification");
});

test("LocalParser preserves commercial assistant answers without regression", async () => {
  // Price question is not an action
  const priceQ = await parse("¿Cuánto cuesta la 401?");
  assert.equal(priceQ.kind, "reply");
  assert.match(priceQ.message, /Residencia 401.*485/);

  // Virtual tour check question is informational, not a blind open_tour
  const tourCheck = await parse("¿La 401 tiene tour?");
  assert.equal(tourCheck.kind, "reply");
  assert.match(tourCheck.message, /Sí, la Residencia 401 cuenta con recorrido virtual/);

  // Comparison query
  const compare = await parse("Compara 301 y 302");
  assert.equal(compare.kind, "reply");
  assert.match(compare.message, /Residencia 301/);
  assert.match(compare.message, /Residencia 302/);

  // Budget query
  const budget = await parse("Presupuesto de 450000 USD");
  assert.equal(budget.kind, "reply");
  assert.match(budget.message, /Residencia 201/);
});
