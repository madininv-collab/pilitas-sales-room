import type { UnitId, Language, Currency, Residence } from "../../pilitas/types";
import { initialResidences } from "../../pilitas/catalog";
import { answerQuestion } from "../../pilitas/assistant";
import { resolveKnowledgeQuery } from "../knowledge/resolver";
import type {
  ConciergeContext,
  ConciergeProvider,
  ProviderDecision,
  ToolDescriptor,
} from "../contracts";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function extractUnitId(text: string): UnitId | null {
  const match = text.match(/\b(?:([2-5]0[1-4])|ph\s*([12]))\b/);
  if (!match) return null;
  if (match[1]) return match[1] as UnitId;
  if (match[2]) return `PH${match[2]}` as UnitId;
  return null;
}

function extractAllUnitIds(text: string): UnitId[] {
  const matches = text.match(/\b(?:[2-5]0[1-4]|ph\s*[12])\b/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\s/g, "").toUpperCase() as UnitId))];
}

function adaptContextForAssistant(context: ConciergeContext): {
  residences: Residence[];
  selectedId: UnitId | null;
  language: Language;
  currency: Currency;
  mxnPerUsd: number;
  isCurrent: boolean;
} {
  // Update initial residences with statuses from context snapshot
  const statusMap = new Map(context.inventory.residences.map((r) => [r.id, r.status]));
  const priceMap = new Map(context.inventory.residences.map((r) => [r.id, r.priceUsd]));

  const residences: Residence[] = initialResidences.map((unit) => ({
    ...unit,
    status: statusMap.get(unit.id) ?? unit.status,
    price: priceMap.get(unit.id) ?? unit.price,
  }));

  return {
    residences,
    selectedId: context.navigation.selectedResidenceId,
    language: context.project.language,
    currency: context.project.currency,
    mxnPerUsd: context.project.exchangeRate.mxnPerUsd,
    isCurrent: context.inventory.syncStatus === "synced",
  };
}

export const localParserProvider: ConciergeProvider = {
  id: "local_deterministic_parser",

  async interpret(input: {
    readonly text: string;
    readonly context: ConciergeContext;
    readonly tools: readonly ToolDescriptor[];
    readonly signal?: AbortSignal;
  }): Promise<ProviderDecision> {
    const raw = input.text;
    const clean = normalizeText(raw);
    const lang = input.context.project.language;
    const es = lang === "es";

    if (!clean) {
      return {
        kind: "reply",
        message: es
          ? "¿En qué te puedo ayudar? Puedes pedirme ver una unidad, abrir el inventario o consultar precios."
          : "How can I help you? You can ask me to show a residence, open inventory, or check prices.",
      };
    }

    // 1. Isolated Unit Number check: conservative rule (e.g. "401")
    if (/^(?:[2-5]0[1-4]|ph\s*[12])$/.test(clean)) {
      const unit = clean.replace(/\s/g, "").toUpperCase();
      return {
        kind: "clarification",
        message: es
          ? `Para consultar o navegar a la ${unit}, escribe por ejemplo: "Muéstrame la ${unit}" o "¿Cuánto cuesta la ${unit}?".`
          : `To view or query unit ${unit}, try: "Show me ${unit}" or "How much is ${unit}?".`,
      };
    }

    // 2. Negations check: do not perform actions on negative intent
    if (/\b(?:no\s+(?:abras|cierres|cambies|muestres|selecciones|pongas|show|open|close|switch)|don't|do\s+not)\b/.test(clean)) {
      return {
        kind: "reply",
        message: es
          ? "Entendido, no realizaré ninguna acción de navegación."
          : "Understood, I will not perform any navigation action.",
      };
    }

    // 3. Ambiguity check: multiple units with "o" / "or"
    const unitIds = extractAllUnitIds(clean);
    if (unitIds.length > 1 && (/\b(?:o|or)\b/.test(clean) || (/\b(?:y|and)\b/.test(clean) && !/\b(?:compara|compare)\b/.test(clean)))) {
      return {
        kind: "clarification",
        message: es
          ? `Mencionaste varias residencias (${unitIds.join(", ")}). Por favor indica una sola residencia a la vez para navegar.`
          : `You mentioned multiple residences (${unitIds.join(", ")}). Please specify one at a time for navigation.`,
      };
    }

    // 4. Multiple conflicting actions (e.g. "abre el plano y cambia a dolares")
    const actionIntentCount = [
      /\b(?:plano|floor\s*plan)\b/.test(clean),
      /\b(?:tour|recorrido\s*360)\b/.test(clean),
      /\b(?:inventario|inventory)\b/.test(clean),
      /\b(?:fachada|facade)\b/.test(clean),
      /\b(?:dolares|pesos|usd|mxn)\b/.test(clean) && /\b(?:cambia|switch)\b/.test(clean),
    ].filter(Boolean).length;

    if (actionIntentCount > 1) {
      return {
        kind: "clarification",
        message: es
          ? "Detecté múltiples órdenes en tu mensaje. Por favor solicita una acción a la vez."
          : "I detected multiple actions in your message. Please request one action at a time.",
      };
    }

    // 5. Explicit Action Intent: Floor Plan
    if (/\b(?:plano|floor\s*plan)\b/.test(clean)) {
      if (/\b(?:cierra|cerrar|close)\b/.test(clean)) {
        return {
          kind: "action",
          action: { type: "close_floor_plan" },
        };
      }
      const unitId = extractUnitId(clean) ?? input.context.navigation.selectedResidenceId;
      if (unitId) {
        return {
          kind: "action",
          action: { type: "open_floor_plan", residenceId: unitId },
        };
      }
      return {
        kind: "clarification",
        message: es
          ? "Indica de qué residencia deseas ver el plano arquitectónico (por ejemplo: 'Plano de la 401')."
          : "Please specify which residence floor plan you would like to view (e.g. 'Floor plan of 401').",
      };
    }

    // 6. Explicit Action Intent: Close Floor Plan (generic "cierra el plano / modal")
    if (/\b(?:cierra|cerrar|close)\s+(?:el\s+)?(?:plano|floor\s*plan)\b/.test(clean)) {
      return {
        kind: "action",
        action: { type: "close_floor_plan" },
      };
    }

    // 7. Explicit Action Intent: Virtual Tour
    if (/\b(?:tour|recorrido\s*360|virtual\s*tour)\b/.test(clean)) {
      // If user asks "¿tiene tour la 401?", handle as commercial query
      if (/\b(?:tiene|cuenta\s+con|has|does)\b/.test(clean)) {
        const unitId = extractUnitId(clean) ?? input.context.navigation.selectedResidenceId;
        if (unitId) {
          const hasTour = input.context.capabilities.availableTours.includes(unitId);
          return {
            kind: "reply",
            message: es
              ? (hasTour
                  ? `Sí, la Residencia ${unitId} cuenta con recorrido virtual 360°. Puedes decir "Abre el tour de la ${unitId}" para verlo.`
                  : `La Residencia ${unitId} no cuenta con recorrido virtual disponible actualmente.`)
              : (hasTour
                  ? `Yes, Residence ${unitId} has a 360° virtual tour. You can say "Open tour for ${unitId}" to view it.`
                  : `Residence ${unitId} does not currently have a virtual tour available.`),
          };
        }
      }

      const unitId = extractUnitId(clean) ?? input.context.navigation.selectedResidenceId;
      if (unitId) {
        return {
          kind: "action",
          action: { type: "open_tour", residenceId: unitId },
        };
      }
      return {
        kind: "clarification",
        message: es
          ? "Indica de qué residencia deseas abrir el recorrido virtual (por ejemplo: 'Tour de la 401')."
          : "Please specify which residence virtual tour you want to open (e.g. 'Tour of 401').",
      };
    }

    // 8. Explicit Action Intent: Inventory
    if (/\b(?:inventario|inventory)\b/.test(clean)) {
      if (/\b(?:cierra|cerrar|close)\b/.test(clean)) {
        return {
          kind: "action",
          action: { type: "close_inventory" },
        };
      }
      return {
        kind: "action",
        action: { type: "open_inventory" },
      };
    }

    // 9. Explicit Action Intent: Amenities (Lobby / Rooftop)
    if (/\b(?:rooftop|roof|alberca|pool|terraza|terrace)\b/.test(clean)) {
      return {
        kind: "action",
        action: { type: "show_amenity", amenityId: "rooftop" },
      };
    }

    if (/\b(?:lobby|acceso|recepcion)\b/.test(clean)) {
      return {
        kind: "action",
        action: { type: "show_amenity", amenityId: "lobby" },
      };
    }

    // 10. Explicit Action Intent: Facade
    if (/\b(?:fachada\s+(?:posterior|trasera)|rear\s*facade|back\s*facade)\b/.test(clean)) {
      return {
        kind: "action",
        action: { type: "set_facade", facade: "rear" },
      };
    }

    if (/\b(?:fachada\s+(?:frontal|principal)|front\s*facade|main\s*facade)\b/.test(clean)) {
      return {
        kind: "action",
        action: { type: "set_facade", facade: "front" },
      };
    }

    // 11. Explicit Action Intent: Currency (only when commanded to switch)
    if (/\b(?:cambia(?:r)?\s+a\s+dolares|switch\s+to\s+usd|en\s+dolares)\b/.test(clean) || (clean === "dolares" || clean === "usd")) {
      return {
        kind: "action",
        action: { type: "set_currency", currency: "USD" },
      };
    }

    if (/\b(?:cambia(?:r)?\s+a\s+pesos|switch\s+to\s+mxn|en\s+pesos)\b/.test(clean) || (clean === "pesos" || clean === "mxn")) {
      return {
        kind: "action",
        action: { type: "set_currency", currency: "MXN" },
      };
    }

    // 12. Explicit Action Intent: Language
    if (/\b(?:ponlo\s+en\s+ingles|cambia(?:r)?\s+a\s+ingles|switch\s+to\s+english|english|en\s+ingles)\b/.test(clean)) {
      return {
        kind: "action",
        action: { type: "set_language", language: "en" },
      };
    }

    if (/\b(?:ponlo\s+en\s+espanol|cambia(?:r)?\s+a\s+espanol|switch\s+to\s+spanish|spanish|en\s+espanol)\b/.test(clean)) {
      return {
        kind: "action",
        action: { type: "set_language", language: "es" },
      };
    }

    // 13. Explicit Action Intent: Select Residence (Navigation)
    // Distinguish questions from navigation commands!
    const isCommercialQuestion = /\b(?:cuanto|cuesta|precio|cost|price|how\s+much|presupuesto|budget|compara|compare|vista|view|disponible|available)\b/.test(clean);
    const unitId = extractUnitId(clean);

    if (unitId && !isCommercialQuestion) {
      if (/\b(?:muestrame|ensename|ver|selecciona|mostrar|show\s+me|show|select|mira|ir\s+a)\b/.test(clean)) {
        return {
          kind: "action",
          action: { type: "select_residence", residenceId: unitId },
        };
      }
    }

    // 14. Smart Recommendation / Selection by Bedrooms from Live Inventory
    if (/\b(?:muestrame|ensename|ver|selecciona|quiero|recomiendame|recomienda|show\s+me|show|select|want|recommend)\b/.test(clean)) {
      const wantsTwoBeds = /\b(?:dos|2|two)\s+(?:recamaras?|habitaciones?|dormitorios?|bedrooms?|beds?)\b/.test(clean);
      const wantsOneBed = /\b(?:una?|1|one)\s+(?:recamaras?|habitaciones?|dormitorios?|bedrooms?|beds?)\b/.test(clean);

      if (wantsTwoBeds || wantsOneBed) {
        const targetBeds = wantsTwoBeds ? 2 : 1;
        const availableMatches = input.context.inventory.residences.filter(
          (u) => u.beds === targetBeds && u.status === "Disponible"
        );

        if (availableMatches.length > 0) {
          const recommended = availableMatches[0];
          return {
            kind: "action",
            action: { type: "select_residence", residenceId: recommended.id },
            thought: es
              ? `Recomendando ${recommended.name} (${targetBeds} rec., disponible).`
              : `Recommending ${recommended.name} (${targetBeds} bed, available).`,
          };
        }
      }
    }

    // 15. Knowledge Base Resolver (Manual v2.0 + Verified Baseline)
    const knowledgeAnswer = resolveKnowledgeQuery(raw, input.context);
    if (knowledgeAnswer) {
      return {
        kind: "reply",
        message: knowledgeAnswer.text,
      };
    }

    // 16. Fallback: Commercial Questions answered by answerQuestion()
    const adaptedContext = adaptContextForAssistant(input.context);
    const commercialAnswer = answerQuestion(raw, adaptedContext);

    return {
      kind: "reply",
      message: commercialAnswer,
    };
  },
};

