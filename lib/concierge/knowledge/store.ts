import type {
  KnowledgeCategory,
  KnowledgeItem,
  KnowledgeQueryResult,
  KnowledgeStore,
  VerificationStatus,
} from "./types";
import { MANUAL_V2_ITEMS } from "./data/manual-v2-records";
import { VERIFIED_BASELINE_ITEMS } from "./data/verified-baseline";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function createKnowledgeStore(customItems?: readonly KnowledgeItem[]): KnowledgeStore {
  const allItems: KnowledgeItem[] = customItems
    ? [...customItems]
    : [...VERIFIED_BASELINE_ITEMS, ...MANUAL_V2_ITEMS];

  const itemMap = new Map<string, KnowledgeItem>(allItems.map((item) => [item.id, item]));

  return {
    getItem(id: string): KnowledgeItem | undefined {
      return itemMap.get(id);
    },

    listByCategory(category: KnowledgeCategory): readonly KnowledgeItem[] {
      return allItems.filter((item) => item.category === category);
    },

    listByStatus(status: VerificationStatus): readonly KnowledgeItem[] {
      return allItems.filter((item) => item.status === status);
    },

    getAll(): readonly KnowledgeItem[] {
      return allItems;
    },

    findRelevant(rawQuery: string): readonly KnowledgeItem[] {
      const q = normalizeText(rawQuery);
      if (!q) return [];

      const tokens = q.split(" ").filter((w) => w.length > 2);
      if (tokens.length === 0) return [];

      return allItems.filter((item) => {
        const textTarget = normalizeText(
          `${item.topic} ${item.content.es} ${item.content.en} ${item.conflictNotes ?? ""} ${item.missingField ?? ""}`
        );
        return tokens.some((token) => textTarget.includes(token));
      });
    },

    resolveCustomerQuery(rawQuery: string, language: "es" | "en"): KnowledgeQueryResult | null {
      const q = normalizeText(rawQuery);
      const es = language === "es";

      // 1. Conflict Interception: Mazatlán location query
      if (/\b(?:mazatlan|malecon|sinaloa|isla\s*el\s*venado|piedra\s*blanca|catedral)\b/.test(q)) {
        const item = itemMap.get("K01")!;
        return {
          item,
          allowedForCustomer: true,
          customerResponse: {
            es: "El proyecto Las Verandas de Olas Altas se ubica en Puerto Vallarta, Jalisco (Calle Pilitas, Zona Romántica), a pasos de la Playa Los Muertos. No está ubicado en Mazatlán.",
            en: "Las Verandas de Olas Altas is located in Puerto Vallarta, Jalisco (Pilitas Street, Romantic Zone), steps from Los Muertos Beach. It is not located in Mazatlán.",
          },
          sourceDisclaimer: {
            es: "Nota de verificación: Corrección oficial frente a borradores preliminares.",
            en: "Verification note: Official correction over preliminary drafts.",
          },
        };
      }

      // 2. Conflict Interception: 3 bedrooms query
      if (/\b(?:3|tres|three)\s*(?:recamaras?|habitaciones?|dormitorios?|bedrooms?|beds?)\b/.test(q)) {
        const item = itemMap.get("K09")!;
        return {
          item,
          allowedForCustomer: true,
          customerResponse: {
            es: "El desarrollo cuenta exclusivamente con residencias de 1 y 2 recámaras (16 unidades en total). No disponemos de tipologías de 3 recámaras en este proyecto.",
            en: "The development exclusively features 1 and 2 bedroom residences (16 units in total). We do not have 3-bedroom layouts in this project.",
          },
          sourceDisclaimer: {
            es: "Inventario verificado del Sales Room.",
            en: "Verified Sales Room inventory.",
          },
        };
      }

      // 3. Conflict Interception: Dual-level penthouses with private pool
      if (/\b(?:alberca\s*privada|private\s*pool|plunge\s*pool|dos\s*niveles|dual\s*level)\b/.test(q) && /\b(?:penthouse|ph)\b/.test(q)) {
        const item = itemMap.get("K11")!;
        return {
          item,
          allowedForCustomer: true,
          customerResponse: {
            es: "Los penthouses (PH1 y PH2) son de un solo nivel (Nivel 6). La alberca panorámica y el asoleadero se encuentran en el Rooftop comunitario (Nivel 7), justo sobre el nivel PH.",
            en: "The penthouses (PH1 and PH2) are single-level (Level 6). The panoramic pool and sun deck are located on the shared Rooftop (Level 7), directly above.",
          },
          sourceDisclaimer: {
            es: "Catálogo arquitectónico verificado.",
            en: "Verified architectural catalog.",
          },
        };
      }

      // 4. Financial / ROI / Rentabilidad guard (K19 - strictly blocked from speculation)
      if (/\b(?:roi|rentabilidad|plusvalia|retorno|rendimiento|yield|appreciation)\b/.test(q)) {
        const item = itemMap.get("K19")!;
        return {
          item,
          allowedForCustomer: false,
          customerResponse: {
            es: "No emitimos proyecciones financieras ni promesas de rendimiento especulativas. Con gusto un asesor comercial puede brindarte información sobre la plusvalía histórica y el comportamiento de la Zona Romántica.",
            en: "We do not provide speculative financial projections or yield promises. A sales advisor will be happy to share historical appreciation data for the Romantic Zone.",
          },
          sourceDisclaimer: {
            es: "Política ética comercial: derivación a asesor humano.",
            en: "Commercial ethics policy: advisor handoff.",
          },
        };
      }

      // 5. Delivery Date guard (U06 - unknown)
      if (/\b(?:entrega|fecha|entregar|cuando\s*entregan|delivery|completion|handover)\b/.test(q)) {
        const item = itemMap.get("U06")!;
        return {
          item,
          allowedForCustomer: false,
          customerResponse: {
            es: "No tengo una fecha de entrega confirmada en este momento. Con gusto podemos registrar tu consulta para que un asesor te comparta el calendario oficial de obra.",
            en: "I do not have a confirmed delivery date at this time. We can record your query for an advisor to provide the official construction schedule.",
          },
        };
      }

      // 6. Maintenance fees / HOA guard (U03 - unknown)
      if (/\b(?:mantenimiento|cuota|hoa|maintenance|fees?)\b/.test(q)) {
        const item = itemMap.get("U03")!;
        return {
          item,
          allowedForCustomer: false,
          customerResponse: {
            es: "La cuota de mantenimiento por metro cuadrado está pendiente de confirmación formal por la administración del condominio. Un asesor puede orientarte con el estimado de la zona.",
            en: "The maintenance fee per square meter is pending formal confirmation by the condominium administration. An advisor can guide you with the area estimate.",
          },
        };
      }

      // 7. Parking and Pets (K17 - provisional)
      if (/\b(?:estacionamiento|parking|cochera|coche|auto|mascotas?|pets?|perro|dog)\b/.test(q)) {
        const item = itemMap.get("K17")!;
        return {
          item,
          allowedForCustomer: true,
          customerResponse: {
            es: es
              ? "El proyecto contempla estacionamiento subterráneo y un entorno amigable con mascotas con áreas designadas. Las condiciones específicas de asignación están sujetas a confirmación con ventas."
              : "The project plans underground parking and a pet-friendly environment with designated areas. Specific assignment rules are subject to confirmation with sales.",
            en: "The project plans underground parking and a pet-friendly environment with designated areas. Specific assignment rules are subject to confirmation with sales.",
          },
        };
      }

      // 8. Legal Framework & Permits (K14, K15, K16, U02)
      if (/\b(?:fideicomiso|escritura|permisos?|licencias?|mia|reglamento|condominio|bank\s*trust|deed|legal)\b/.test(q)) {
        const item = itemMap.get("K14")!;
        return {
          item,
          allowedForCustomer: false,
          customerResponse: {
            es: "La adquisición puede realizarse mediante fideicomiso bancario para extranjeros o escritura directa para nacionales. Para consultar expedientes legales y de licencias, podemos enlazar a nuestro equipo jurídico y comercial.",
            en: "Acquisition is available via bank trust for foreign buyers or direct deed for Mexican nationals. To review legal files and permits, our legal and sales team will assist you.",
          },
        };
      }

      // 9. Construction Quality and Finishes (K04, K05, K06, K07, K08 - provisional)
      if (/\b(?:acabados?|materiales?|calidad|concreto|marmol|porcelanato|ventan\w*|cristal|vidrio|aire|vrf|clima|finishes|marble|ac)\b/.test(q)) {
        const item = itemMap.get("K05")!;
        return {
          item,
          allowedForCustomer: true,
          customerResponse: {
            es: "Las especificaciones preliminares contemplan estructura de concreto reforzado, ventanería con atenuación acústica y protección UV, climatización VRF y cubiertas de piedra natural. Las especificaciones exactas se confirman en la ficha técnica de cada unidad.",
            en: "Preliminary specs include reinforced concrete structure, sound-dampening UV windows, VRF climate control, and natural stone countertops. Exact specifications are confirmed in each unit's technical sheet.",
          },
        };
      }

      // 10. Rooftop and Amenities (V_AMEN_01)
      if (/\b(?:rooftop|alberca|pool|terraza|terrace|lobby|amenidades?|amenities?)\b/.test(q)) {
        const item = itemMap.get("V_AMEN_01")!;
        return {
          item,
          allowedForCustomer: true,
          customerResponse: {
            es: item.content[language],
            en: item.content.en,
          },
        };
      }

      // 11. Location and Beach proximity (V_LOC_01)
      if (/\b(?:ubicacion|donde|direccion|playa|los\s*muertos|pilitas|location|where|beach)\b/.test(q)) {
        const item = itemMap.get("V_LOC_01")!;
        return {
          item,
          allowedForCustomer: true,
          customerResponse: {
            es: item.content[language],
            en: item.content.en,
          },
        };
      }

      return null;
    },
  };
}

export const defaultKnowledgeStore = createKnowledgeStore();
