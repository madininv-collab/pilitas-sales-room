import type { ConciergeAction, ConciergeContext, PresentationStep } from "../types/contracts";
import type { VisitorPreferences } from "../state/types";

export type TopicGoal =
  | "architecture"
  | "featured_residence"
  | "floor_plan"
  | "amenities"
  | "neighborhood"
  | "investment_summary";

export interface TourPlanRequest {
  readonly context: ConciergeContext;
  readonly preferences: VisitorPreferences;
  readonly coveredTopicGoals?: readonly TopicGoal[];
}

export interface DynamicTourPlan {
  readonly goals: readonly TopicGoal[];
  readonly targetResidenceId: string | null;
  readonly steps: readonly PresentationStep[];
  readonly isTailored: boolean;
}

/**
 * Planificador dinámico de temas y unidades para el Concierge.
 * Prepara la selección flexible de objetivos según el inventario en tiempo real
 * y las preferencias expresadas por el visitante (recámaras, presupuesto, intención).
 */
export function planDynamicTour(request: TourPlanRequest): DynamicTourPlan {
  const { context, preferences } = request;

  // 1. Filtrar unidades realmente disponibles en el inventario activo
  const availableUnits = context.inventory.residences.filter((u) => u.status === "Disponible");

  // 2. Seleccionar unidad objetivo según preferencias expresadas
  let targetUnit = availableUnits.find((u) => {
    if (preferences.bedrooms && u.beds !== preferences.bedrooms) return false;
    if (preferences.budgetMaxUsd && u.priceUsd > preferences.budgetMaxUsd) return false;
    return true;
  });

  // Fallback: primera unidad disponible, o unidad por defecto
  if (!targetUnit && availableUnits.length > 0) {
    targetUnit = availableUnits[0];
  }

  const unitId = targetUnit?.id ?? "401";
  const unitStatus = targetUnit?.status ?? "Disponible";
  const isAvailable = unitStatus === "Disponible";

  const steps: PresentationStep[] = [
    {
      id: "intro",
      order: 0,
      title: {
        es: "Bienvenida a Las Verandas",
        en: "Welcome to Las Verandas",
      },
      narration: {
        es: "Bienvenidos a Las Verandas de Olas Altas, una colección exclusiva de 16 residencias en la Zona Romántica de Puerto Vallarta.",
        en: "Welcome to Las Verandas de Olas Altas, an exclusive collection of 16 residences in Puerto Vallarta's Romantic Zone.",
      },
      visualAction: { type: "set_facade", facade: "front" },
      highlightAction: { type: "clear_highlight" },
      pauseDurationMs: 5500,
      nextStepId: "architecture",
    },
    {
      id: "architecture",
      order: 1,
      title: {
        es: "Arquitectura y Entorno",
        en: "Architecture & Surroundings",
      },
      narration: {
        es: "El proyecto se despliega en 6 niveles con alberca en rooftop, integrando ventilación cruzada y terrazas privadas a pasos de la playa.",
        en: "The project rises across 6 levels with a rooftop pool, offering cross ventilation and private terraces steps from the beach.",
      },
      visualAction: { type: "set_facade", facade: "front" },
      highlightAction: { type: "clear_highlight" },
      pauseDurationMs: 6000,
      nextStepId: "featured_residence",
    },
    {
      id: "featured_residence",
      order: 2,
      title: {
        es: `Residencia ${unitId}`,
        en: `Residence ${unitId}`,
      },
      narration: {
        es: isAvailable
          ? `Te presento la Residencia ${unitId} (${targetUnit?.beds ?? 1} rec., ${targetUnit?.areaM2 ?? 76.9} m²), actualmente disponible en preventa.`
          : `Esta es la Residencia ${unitId}, mostrada como referencia de tipología y distribución arquitectónica.`,
        en: isAvailable
          ? `Here is Residence ${unitId} (${targetUnit?.beds ?? 1} bed, ${targetUnit?.areaM2 ?? 76.9} m²), currently available in pre-sale.`
          : `This is Residence ${unitId}, presented as an architectural layout model.`,
      },
      visualAction: { type: "select_residence", residenceId: unitId },
      highlightAction: {
        type: "set_highlight",
        targetType: "residence",
        targetId: unitId,
        label: `Residencia ${unitId}`,
      },
      pauseDurationMs: 6500,
      nextStepId: "floor_plan",
    },
    {
      id: "floor_plan",
      order: 3,
      title: {
        es: "Plano Arquitectónico",
        en: "Floor Plan",
      },
      narration: {
        es: "En este plano arquitectónico puedes apreciar la distribución interior y la integración de las áreas de estar con la terraza.",
        en: "On this floor plan you can appreciate the interior layout and the flow between living areas and the private terrace.",
      },
      visualAction: { type: "open_floor_plan", residenceId: unitId },
      highlightAction: {
        type: "set_highlight",
        targetType: "control",
        targetId: "floor_plan_canvas",
        label: `Plano · Residencia ${unitId}`,
      },
      pauseDurationMs: 7000,
      nextStepId: "amenity_rooftop",
    },
    {
      id: "amenity_rooftop",
      order: 4,
      title: {
        es: "Rooftop y Alberca",
        en: "Rooftop & Pool",
      },
      narration: {
        es: "En el nivel superior encontramos el Rooftop: área común con alberca infinity, asoleadero y vistas a la bahía.",
        en: "On the top level we find the Rooftop: shared amenity featuring infinity pool, sundeck, and bay views.",
      },
      visualAction: { type: "show_amenity", amenityId: "rooftop" },
      highlightAction: {
        type: "set_highlight",
        targetType: "amenity",
        targetId: "rooftop",
        label: "Rooftop & Alberca",
      },
      pauseDurationMs: 6500,
      nextStepId: "closing",
    },
    {
      id: "closing",
      order: 5,
      title: {
        es: "Exploración y Asesoría",
        en: "Explore & Sales Contact",
      },
      narration: {
        es: "Te invito a explorar el inventario o preguntarme cualquier duda. Puedes consultar precios o solicitar contacto directo con ventas.",
        en: "You are invited to explore the inventory or ask any question. Feel free to request direct contact with sales.",
      },
      visualAction: { type: "close_floor_plan" } as ConciergeAction,
      highlightAction: { type: "clear_highlight" } as ConciergeAction,
      pauseDurationMs: 5000,
      nextStepId: null,
    },
  ];

  return {
    goals: ["architecture", "featured_residence", "floor_plan", "amenities", "investment_summary"],
    targetResidenceId: unitId,
    steps,
    isTailored: Boolean(preferences.bedrooms || preferences.budgetMaxUsd),
  };
}
