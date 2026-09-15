import type {
  Residence,
  UnitId,
  ViewId,
  AmenityId,
  Language,
  Currency,
  ExperienceView,
} from "../../pilitas/types";
import { hotspots, virtualTours } from "../../pilitas/catalog";
import type { ConciergeContext, ConciergeResidenceSnapshot } from "../contracts";

export interface BuildContextParams {
  residences: readonly Residence[];
  selectedId: UnitId | null;
  view: ViewId;
  exploring: boolean;
  inventoryOpen: boolean;
  interiorOpen: boolean;
  experienceView: ExperienceView;
  selectedAmenityId: AmenityId | null;
  generalPlansOpen: boolean;
  generalPlanIndex: number;
  totalGeneralPlans: number;
  language: Language;
  currency: Currency;
  mxnPerUsd: number;
  syncStatus: "synced" | "loading" | "unavailable" | "error" | "unknown";
  updatedAt: string | null;
}

const SUPPORTED_TOOLS: readonly string[] = [
  "select_residence",
  "set_facade",
  "open_inventory",
  "close_inventory",
  "open_floor_plan",
  "close_floor_plan",
  "show_amenity",
  "open_tour",
  "set_language",
  "set_currency",
] as const;

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Object.isFrozen(obj)) return obj;

  Object.freeze(obj);
  for (const key of Object.keys(obj as object)) {
    const prop = (obj as Record<string, unknown>)[key];
    if (prop !== null && typeof prop === "object") {
      deepFreeze(prop);
    }
  }
  return obj;
}

export function buildConciergeContext(params: BuildContextParams): ConciergeContext {
  const {
    residences,
    selectedId,
    view,
    exploring,
    inventoryOpen,
    interiorOpen,
    experienceView,
    selectedAmenityId,
    generalPlansOpen,
    generalPlanIndex,
    totalGeneralPlans,
    language,
    currency,
    mxnPerUsd,
    syncStatus,
    updatedAt,
  } = params;

  // Determine facade for each unit from authoritative hotspots catalog
  const frontUnitIds = new Set(hotspots.front.map((zone) => zone.id));

  const residenceSnapshots: ConciergeResidenceSnapshot[] = residences.map((unit) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    level: unit.level,
    beds: unit.beds,
    baths: unit.baths,
    areaM2: unit.area,
    priceUsd: unit.price,
    status: unit.status,
    facade: frontUnitIds.has(unit.id) ? "front" : "rear",
    hasTour: Boolean(virtualTours[unit.id]),
    hasFloorPlan: true,
  }));

  const activeType: "interior" | "plan" | "tour" | "amenity" | null = interiorOpen
    ? selectedAmenityId
      ? "amenity"
      : experienceView
    : null;

  const targetId: string | null = interiorOpen
    ? selectedAmenityId ?? selectedId
    : null;

  const availableTours = Object.keys(virtualTours) as UnitId[];

  const rawContext: ConciergeContext = {
    schemaVersion: "1.0.0",
    project: {
      id: "pilitas",
      name: "Las Verandas de Olas Altas",
      language,
      currency,
      exchangeRate: {
        mxnPerUsd: Number.isFinite(mxnPerUsd) && mxnPerUsd > 0 ? mxnPerUsd : 17.0427,
        source: Number.isFinite(mxnPerUsd) && mxnPerUsd > 0 ? "fixed_catalog" : "unknown",
        asOf: updatedAt,
      },
      mode: exploring ? "exploring" : "presentation",
    },
    navigation: {
      activeFacade: view,
      selectedResidenceId: selectedId,
      inventoryOpen,
      experienceModal: {
        isOpen: interiorOpen,
        activeType,
        targetId,
      },
      selectedAmenityId,
      generalPlans: {
        isOpen: generalPlansOpen,
        activeIndex: generalPlanIndex,
        totalCount: totalGeneralPlans,
      },
    },
    inventory: {
      syncStatus,
      isUsingLocalBackup: syncStatus !== "synced",
      lastUpdated: updatedAt,
      residences: residenceSnapshots,
    },
    capabilities: {
      supportedTools: SUPPORTED_TOOLS,
      availableTours,
    },
  };

  return deepFreeze(rawContext);
}
