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
const { createConciergeEngine } = await vite.ssrLoadModule("/lib/concierge/engine.ts");
const { createSalesRoomAdapter } = await vite.ssrLoadModule("/lib/concierge/adapters/sales-room-adapter.ts");
const { defaultKnowledgeStore } = await vite.ssrLoadModule("/lib/concierge/knowledge/store.ts");

function createMockSalesRoomState(overrides = {}) {
  let selectedId = overrides.selectedId ?? null;
  let view = overrides.view ?? "front";
  let inventoryOpen = false;
  let interiorOpen = overrides.interiorOpen ?? false;
  let experienceView = overrides.experienceView ?? "interior";
  let selectedAmenityId = null;
  let language = "es";
  let currency = "USD";

  const getSnapshot = () =>
    buildConciergeContext({
      residences: initialResidences,
      selectedId,
      view,
      exploring: true,
      inventoryOpen,
      interiorOpen,
      experienceView,
      selectedAmenityId,
      generalPlansOpen: false,
      generalPlanIndex: 0,
      totalGeneralPlans: generalPlans.length,
      language,
      currency,
      mxnPerUsd: 17.0427,
      syncStatus: "synced",
      updatedAt: "2026-09-15T12:00:00.000Z",
    });

  const adapter = createSalesRoomAdapter({
    getContext: getSnapshot,
    selectResidence: (id) => {
      selectedId = id;
    },
    setFacade: (f) => {
      view = f;
    },
    openInventory: () => {
      inventoryOpen = true;
    },
    closeInventory: () => {
      inventoryOpen = false;
    },
    openFloorPlan: (id) => {
      selectedId = id;
      experienceView = "plan";
      interiorOpen = true;
    },
    closeExperience: () => {
      interiorOpen = false;
    },
    showAmenity: (id) => {
      selectedAmenityId = id;
      interiorOpen = true;
    },
    openTour: (id) => {
      selectedId = id;
      experienceView = "tour";
      interiorOpen = true;
    },
    setLanguage: (l) => {
      language = l;
    },
    setCurrency: (c) => {
      currency = c;
    },
    appendChatMessage: () => {},
  });

  return { adapter, getSnapshot };
}

test("Demonstration Flow: Recommend 2-bed unit -> Select on page -> Open Floor Plan", async () => {
  const { adapter } = createMockSalesRoomState();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  // Step 1: User asks for a 2-bedroom unit
  const turn1 = await engine.handle({ text: "Quiero una residencia de dos recámaras" });
  assert.equal(turn1.decision.kind, "action");
  assert.equal(turn1.decision.action.type, "select_residence");
  assert.equal(turn1.decision.action.residenceId, "501");

  // Verify that the Sales Room UI state was updated: Residence 501 is selected
  const contextAfter1 = engine.getContext();
  assert.equal(contextAfter1.navigation.selectedResidenceId, "501");

  // Step 2: User asks to open its floor plan
  const turn2 = await engine.handle({ text: "Abre su plano" });
  assert.equal(turn2.decision.kind, "action");
  assert.equal(turn2.decision.action.type, "open_floor_plan");
  assert.equal(turn2.decision.action.residenceId, "501");

  // Verify that the experience modal opened in plan mode for 501
  const contextAfter2 = engine.getContext();
  assert.equal(contextAfter2.navigation.experienceModal.isOpen, true);
  assert.equal(contextAfter2.navigation.experienceModal.activeType, "plan");
  assert.equal(contextAfter2.navigation.experienceModal.targetId, "501");
});

test("Manual v2.0 Safeguard: Unknown delivery date does NOT produce hallucinated date", async () => {
  const { adapter } = createMockSalesRoomState();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  const turn = await engine.handle({ text: "¿Cuándo es la fecha de entrega?" });
  assert.equal(turn.decision.kind, "reply");
  assert.match(turn.decision.message, /no tengo una fecha de entrega confirmada/i);
  assert.doesNotMatch(turn.decision.message, /\b(?:202[4-9]|203\d|enero|febrero|marzo|diciembre)\b/i);
});

test("Manual v2.0 Safeguard: Unknown HOA / maintenance fee does NOT invent an amount", async () => {
  const { adapter } = createMockSalesRoomState();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  const turn = await engine.handle({ text: "¿Cuánto es la cuota de mantenimiento?" });
  assert.equal(turn.decision.kind, "reply");
  assert.match(turn.decision.message, /mantenimiento por metro cuadrado está pendiente de confirmación/i);
});

test("Manual v2.0 Conflict Guard: Mazatlán location query returns official Puerto Vallarta correction", async () => {
  const { adapter } = createMockSalesRoomState();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  const turn = await engine.handle({ text: "¿El proyecto está en Mazatlán?" });
  assert.equal(turn.decision.kind, "reply");
  assert.match(turn.decision.message, /puerto vallarta, jalisco/i);
  assert.match(turn.decision.message, /no está ubicado en mazatlán/i);
});

test("Manual v2.0 Conflict Guard: 3 bedrooms query clarifies 1 and 2 bedrooms only", async () => {
  const { adapter } = createMockSalesRoomState();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  const turn = await engine.handle({ text: "¿Tienen departamentos de tres recámaras?" });
  assert.equal(turn.decision.kind, "reply");
  assert.match(turn.decision.message, /exclusivamente con residencias de 1 y 2 recámaras/i);
  assert.match(turn.decision.message, /no disponemos de tipologías de 3 recámaras/i);
});

test("Manual v2.0 Commercial Ethics Guard: ROI inquiry refuses speculative yield promises", async () => {
  const { adapter } = createMockSalesRoomState();
  const engine = createConciergeEngine({
    provider: localParserProvider,
    salesRoom: adapter,
  });

  const turn = await engine.handle({ text: "¿Qué ROI o rentabilidad garantizan?" });
  assert.equal(turn.decision.kind, "reply");
  assert.match(turn.decision.message, /no emitimos proyecciones financieras ni promesas de rendimiento/i);
});

test("Knowledge Store holds all K01-K23 and U01-U08 with exact citations", () => {
  const all = defaultKnowledgeStore.getAll();
  assert.ok(all.length >= 31); // 23 K + 8 U + verified items

  const k01 = defaultKnowledgeStore.getItem("K01");
  assert.equal(k01?.status, "CONFLICT");
  assert.equal(k01?.source, "S1 p. 1");

  const k09 = defaultKnowledgeStore.getItem("K09");
  assert.equal(k09?.status, "CONFLICT");
  assert.equal(k09?.source, "S1 p. 2");

  const u06 = defaultKnowledgeStore.getItem("U06");
  assert.equal(u06?.status, "UNKNOWN");
  assert.equal(u06?.source, "S1 p. 5");
});
