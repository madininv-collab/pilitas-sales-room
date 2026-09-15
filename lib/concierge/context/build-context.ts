import type {
  Residence,
  UnitId,
  ViewId,
  AmenityId,
  Language,
  Currency,
  ExperienceView,
  PlanView,
} from "../../pilitas/types";
import { hotspots, virtualTours, generalPlans } from "../../pilitas/catalog";
import type {
  ActiveHighlight,
  ConciergeContext,
  ConciergeResidenceSnapshot,
} from "../contracts";

export interface BuildContextParams {
  residences: readonly Residence[];
  selectedId: UnitId | null;
  view: ViewId;
  exploring: boolean;
  inventoryOpen: boolean;
  mapOpen?: boolean;
  interiorOpen: boolean;
  experienceView: ExperienceView;
  selectedAmenityId: AmenityId | null;
  generalPlansOpen: boolean;
  generalPlanIndex: number;
  totalGeneralPlans: number;
  planView?: PlanView;
  galleryIndex?: number;
  totalGalleryImages?: number;
  activeHighlight?: ActiveHighlight | null;
  isTyping?: boolean;
  language: Language;
  currency: Currency;
  mxnPerUsd: number;
  syncStatus: "synced" | "loading" | "unavailable" | "error" | "unknown";
  updatedAt: string | null;
  voiceInputAvailable?: boolean;
  voiceOutputAvailable?: boolean;
}

const SUPPORTED_TOOLS: readonly string[] = [
  "select_residence",
  "set_facade",
  "open_inventory",
  "close_inventory",
  "open_floor_plan",
  "close_floor_plan",
  "set_plan_view",
  "show_amenity",
  "close_amenity",
  "open_tour",
  "close_tour",
  "open_map",
  "close_map",
  "open_general_plans",
  "set_general_plan_index",
  "close_general_plans",
  "open_interior_gallery",
  "set_gallery_index",
  "set_highlight",
  "clear_highlight",
  "set_language",
  "set_currency",
  "list_units",
  "get_unit_details",
  "get_project_information",
  "request_human_handoff",
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
    mapOpen = false,
    interiorOpen,
    experienceView,
    selectedAmenityId,
    generalPlansOpen,
    generalPlanIndex,
    totalGeneralPlans,
    planView = "color",
    galleryIndex = 0,
    totalGalleryImages = 0,
    activeHighlight = null,
    isTyping = false,
    language,
    currency,
    mxnPerUsd,
    syncStatus,
    updatedAt,
    voiceInputAvailable = false,
    voiceOutputAvailable = false,
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
  const currentLevelLabel = generalPlans[generalPlanIndex]?.label[language] ?? `Nivel ${generalPlanIndex}`;

  const rawContext: ConciergeContext = {
    schemaVersion: "2.0.0",
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
      mapOpen,
      experienceModal: {
        isOpen: interiorOpen,
        activeType,
        targetId,
        planView: activeType === "plan" ? planView : undefined,
        galleryIndex: activeType === "interior" || activeType === "amenity" ? galleryIndex : undefined,
        totalGalleryImages: totalGalleryImages > 0 ? totalGalleryImages : undefined,
      },
      selectedAmenityId,
      generalPlans: {
        isOpen: generalPlansOpen,
        activeIndex: generalPlanIndex,
        totalCount: totalGeneralPlans,
        currentLevelLabel,
      },
      activeHighlight,
      isTyping,
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
      voiceInputAvailable,
      voiceOutputAvailable,
    },
  };

  return deepFreeze(rawContext);
}
