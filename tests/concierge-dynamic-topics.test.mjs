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
  planDynamicTour,
} = await vite.ssrLoadModule("/lib/concierge/index.ts");

const { initialResidences } = await vite.ssrLoadModule("/lib/pilitas/catalog.ts");

test("planDynamicTour adapts target residence to visitor bedroom preferences", () => {
  const context = buildConciergeContext({
    residences: initialResidences,
    language: "es",
    currency: "USD",
  });

  // User wanting 2 bedrooms
  const plan2Beds = planDynamicTour({
    context,
    preferences: { bedrooms: 2 },
  });

  assert.equal(plan2Beds.isTailored, true);
  // Must select an available 2-bedroom unit (e.g. 501 or 502)
  const selectedUnit = initialResidences.find((u) => u.id === plan2Beds.targetResidenceId);
  assert.equal(selectedUnit?.beds, 2);
  assert.equal(selectedUnit?.status, "Disponible");

  // Verify step visual actions point to that unit
  const resStep = plan2Beds.steps.find((s) => s.id === "featured_residence");
  assert.equal(resStep?.visualAction?.residenceId, plan2Beds.targetResidenceId);

  const planStep = plan2Beds.steps.find((s) => s.id === "floor_plan");
  assert.equal(planStep?.visualAction?.residenceId, plan2Beds.targetResidenceId);
});

test("planDynamicTour falls back to available unit when 401 is sold", () => {
  const residencesWith401Sold = initialResidences.map((u) =>
    u.id === "401" ? { ...u, status: "Vendida" } : u
  );

  const context = buildConciergeContext({
    residences: residencesWith401Sold,
    language: "es",
    currency: "USD",
  });

  const plan = planDynamicTour({
    context,
    preferences: { bedrooms: 1 },
  });

  // Since 401 is sold, it must select another available 1-bed unit or available unit
  const chosenUnit = residencesWith401Sold.find((u) => u.id === plan.targetResidenceId);
  assert.equal(chosenUnit?.status, "Disponible");
  assert.notEqual(plan.targetResidenceId, "401");
});
