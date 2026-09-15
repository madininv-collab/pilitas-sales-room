import type { PresentationStep } from "../contracts";

export const PILITAS_PRESENTATION_SCRIPT: readonly PresentationStep[] = [
  {
    id: "intro",
    order: 0,
    title: {
      es: "Bienvenida a Las Verandas",
      en: "Welcome to Las Verandas",
    },
    narration: {
      es: "Bienvenidos a Las Verandas de Olas Altas, una colección exclusiva de 16 residencias en la vibrante Zona Romántica de Puerto Vallarta.",
      en: "Welcome to Las Verandas de Olas Altas, an exclusive collection of 16 residences in the vibrant Romantic Zone of Puerto Vallarta.",
    },
    visualAction: { type: "set_facade", facade: "front" },
    highlightAction: { type: "clear_highlight" },
    pauseDurationMs: 6000,
    nextStepId: "architecture",
  },
  {
    id: "architecture",
    order: 1,
    title: {
      es: "Arquitectura y Entorno",
      en: "Architecture & Setting",
    },
    narration: {
      es: "El edificio cuenta con arquitectura contemporánea integrada a su entorno, con unidades frontales y posteriores orientadas para maximizar luz y ventilación natural a pasos de la playa.",
      en: "The building features contemporary architecture integrated into its surroundings, with front and rear units oriented to maximize natural light and ventilation steps from the beach.",
    },
    visualAction: { type: "set_facade", facade: "front" },
    highlightAction: { type: "clear_highlight" },
    pauseDurationMs: 6500,
    nextStepId: "show_residence",
  },
  {
    id: "show_residence",
    order: 2,
    title: {
      es: "Residencia Destacada 401",
      en: "Featured Residence 401",
    },
    narration: {
      es: "Esta es la Residencia 401 en el cuarto nivel: una recámara, un baño y 76.90 m² de área total con terraza privada y acabados de lujo.",
      en: "This is Residence 401 on the fourth level: one bedroom, one bath, and 76.90 m² of total area with a private terrace and luxury finishes.",
    },
    visualAction: { type: "select_residence", residenceId: "401" },
    highlightAction: {
      type: "set_highlight",
      targetType: "residence",
      targetId: "401",
      label: "Residencia 401 · Nivel 4",
    },
    pauseDurationMs: 6500,
    nextStepId: "show_plan",
  },
  {
    id: "show_plan",
    order: 3,
    title: {
      es: "Plano Arquitectónico",
      en: "Floor Plan",
    },
    narration: {
      es: "Aquí podemos observar la distribución del plano arquitectónico, integrando sala, comedor, cocina abierta y recámara en suite con terraza.",
      en: "Here we can observe the architectural floor plan layout, seamlessly integrating living, dining, open kitchen, and en-suite bedroom with a private terrace.",
    },
    visualAction: { type: "open_floor_plan", residenceId: "401" },
    highlightAction: {
      type: "set_highlight",
      targetType: "control",
      targetId: "floor_plan_canvas",
      label: "Plano Arquitectónico · Residencia 401",
    },
    pauseDurationMs: 7000,
    nextStepId: "show_amenity_rooftop",
  },
  {
    id: "show_amenity_rooftop",
    order: 4,
    title: {
      es: "Rooftop y Alberca",
      en: "Rooftop & Pool",
    },
    narration: {
      es: "En el nivel superior encontramos el Rooftop: una terraza elevada con alberca infinity, asoleadero y vistas panorámicas hacia la bahía.",
      en: "On the top level we find the Rooftop: an elevated terrace featuring an infinity pool, lounge areas, and panoramic ocean views.",
    },
    visualAction: { type: "show_amenity", amenityId: "rooftop" },
    highlightAction: {
      type: "set_highlight",
      targetType: "amenity",
      targetId: "rooftop",
      label: "Rooftop & Alberca Infinity",
    },
    pauseDurationMs: 6500,
    nextStepId: "closing",
  },
  {
    id: "closing",
    order: 5,
    title: {
      es: "Exploración y Asesoría",
      en: "Explore & Inquire",
    },
    narration: {
      es: "Te invitamos a explorar el inventario completo, los planos o preguntarme cualquier duda sobre precios, niveles y disponibilidad.",
      en: "We invite you to explore the full inventory, floor plans, or ask me any questions about pricing, levels, and availability.",
    },
    visualAction: { type: "close_floor_plan" },
    highlightAction: { type: "clear_highlight" },
    pauseDurationMs: 5000,
    nextStepId: null,
  },
] as const;

export function getPresentationStep(id: string): PresentationStep | undefined {
  return PILITAS_PRESENTATION_SCRIPT.find((step) => step.id === id);
}

/**
 * Script de demostración guiada local (6 etapas).
 * El presentador local utiliza esta secuencia estructurada como demostración determinista.
 * La selección dinámica y la improvisación en vivo quedarán gobernadas por el planificador de temas en la Fase 2.
 */
export const PILITAS_LOCAL_DEMO_SCRIPT = PILITAS_PRESENTATION_SCRIPT;
