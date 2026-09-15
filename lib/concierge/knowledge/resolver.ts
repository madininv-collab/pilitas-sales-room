import type { ConciergeContext } from "../contracts";
import type { KnowledgeStore } from "./types";
import { defaultKnowledgeStore } from "./store";

export interface ResolvedKnowledgeAnswer {
  readonly text: string;
  readonly category: "live_inventory" | "knowledge_base" | "unknown_guard" | "conflict_guard" | "fallback";
  readonly requiresAdvisorHandoff: boolean;
  readonly topicId?: string;
}

export function resolveKnowledgeQuery(
  rawQuery: string,
  context: ConciergeContext,
  store: KnowledgeStore = defaultKnowledgeStore
): ResolvedKnowledgeAnswer | null {
  const lang = context.project.language;

  // Check Knowledge Store first for strict guards (conflicts, unknown, legal, financial)
  const knowledgeResult = store.resolveCustomerQuery(rawQuery, lang);
  if (knowledgeResult) {
    const isConflict = knowledgeResult.item.status === "CONFLICT";
    const isUnknown = knowledgeResult.item.status === "UNKNOWN";

    return {
      text: knowledgeResult.customerResponse[lang],
      category: isConflict
        ? "conflict_guard"
        : isUnknown
        ? "unknown_guard"
        : "knowledge_base",
      requiresAdvisorHandoff: Boolean(knowledgeResult.item.escalationRequired),
      topicId: knowledgeResult.item.id,
    };
  }

  return null;
}
