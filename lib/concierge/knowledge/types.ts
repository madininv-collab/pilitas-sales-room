export type VerificationStatus = "VERIFIED" | "PROVISIONAL" | "UNKNOWN" | "CONFLICT";

export type KnowledgeCategory =
  | "identity_location"
  | "architecture_structure"
  | "finishes_specs"
  | "inventory_typologies"
  | "amenities_views"
  | "legal_framework"
  | "financials_roi"
  | "pricing_payments"
  | "operation_services";

export interface KnowledgeItem {
  readonly id: string;
  readonly category: KnowledgeCategory;
  readonly topic: string;
  readonly status: VerificationStatus;
  readonly source: string;
  readonly confidence: number;
  readonly lastUpdated: string;
  readonly content: {
    readonly es: string;
    readonly en: string;
  };
  readonly conflictNotes?: string;
  readonly missingField?: string;
  readonly escalationRequired?: boolean;
}

export interface KnowledgeQueryResult {
  readonly item: KnowledgeItem;
  readonly allowedForCustomer: boolean;
  readonly customerResponse: {
    readonly es: string;
    readonly en: string;
  };
  readonly sourceDisclaimer?: {
    readonly es: string;
    readonly en: string;
  };
}

export interface KnowledgeStore {
  getItem(id: string): KnowledgeItem | undefined;
  listByCategory(category: KnowledgeCategory): readonly KnowledgeItem[];
  listByStatus(status: VerificationStatus): readonly KnowledgeItem[];
  getAll(): readonly KnowledgeItem[];
  findRelevant(query: string): readonly KnowledgeItem[];
  resolveCustomerQuery(query: string, language: "es" | "en"): KnowledgeQueryResult | null;
}
