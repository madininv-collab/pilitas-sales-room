import type {
  UnitId,
  ViewId,
  AmenityId,
  Language,
  Currency,
} from "../../pilitas/types";
import type { ConversationState } from "../state/types";
import type { KnowledgeStore } from "../knowledge/types";

export interface ConciergeResidenceSnapshot {
  readonly id: UnitId;
  readonly code: string;
  readonly name: string;
  readonly level: number;
  readonly beds: number;
  readonly baths: number;
  readonly areaM2: number;
  readonly priceUsd: number;
  readonly status: "Disponible" | "Apartada" | "Vendida";
  readonly facade: ViewId;
  readonly hasTour: boolean;
  readonly hasFloorPlan: boolean;
}

export interface ConciergeContext {
  readonly schemaVersion: "1.0.0";
  readonly project: {
    readonly id: "pilitas";
    readonly name: string;
    readonly language: Language;
    readonly currency: Currency;
    readonly exchangeRate: {
      readonly mxnPerUsd: number;
      readonly source: "fixed_catalog" | "unknown";
      readonly asOf: string | null;
    };
    readonly mode: "presentation" | "exploring";
  };
  readonly navigation: {
    readonly activeFacade: ViewId;
    readonly selectedResidenceId: UnitId | null;
    readonly inventoryOpen: boolean;
    readonly experienceModal: {
      readonly isOpen: boolean;
      readonly activeType: "interior" | "plan" | "tour" | "amenity" | null;
      readonly targetId: string | null;
    };
    readonly selectedAmenityId: AmenityId | null;
    readonly generalPlans: {
      readonly isOpen: boolean;
      readonly activeIndex: number;
      readonly totalCount: number;
    };
    readonly mapOpen?: boolean;
  };
  readonly inventory: {
    readonly syncStatus: "synced" | "loading" | "unavailable" | "error" | "unknown";
    readonly isUsingLocalBackup: boolean;
    readonly lastUpdated: string | null;
    readonly residences: readonly ConciergeResidenceSnapshot[];
  };
  readonly capabilities: {
    readonly supportedTools: readonly string[];
    readonly availableTours: readonly UnitId[];
  };
}

export type ConciergeAction =
  | { readonly type: "select_residence"; readonly residenceId: UnitId }
  | { readonly type: "set_facade"; readonly facade: ViewId }
  | { readonly type: "open_inventory" }
  | { readonly type: "close_inventory" }
  | { readonly type: "open_floor_plan"; readonly residenceId: UnitId }
  | { readonly type: "close_floor_plan" }
  | { readonly type: "show_amenity"; readonly amenityId: AmenityId }
  | { readonly type: "open_tour"; readonly residenceId: UnitId }
  | { readonly type: "open_map" }
  | { readonly type: "close_map" }
  | { readonly type: "set_language"; readonly language: Language }
  | { readonly type: "set_currency"; readonly currency: Currency }
  | {
      readonly type: "list_units";
      readonly beds?: number;
      readonly maxPriceUsd?: number;
      readonly minPriceUsd?: number;
      readonly status?: "Disponible" | "Apartada" | "Vendida";
      readonly facade?: ViewId;
    }
  | { readonly type: "get_unit_details"; readonly residenceId: UnitId }
  | { readonly type: "get_project_information"; readonly topic: string }
  | {
      readonly type: "request_human_handoff";
      readonly reason: string;
      readonly preferredChannel?: "whatsapp" | "email" | "appointment";
    };

export type ToolErrorCode =
  | "INVALID_ARGUMENTS"
  | "UNKNOWN_TOOL"
  | "NOT_FOUND"
  | "NOT_AVAILABLE"
  | "PRECONDITION_FAILED"
  | "EXECUTION_FAILED";

export type ToolResult =
  | {
      readonly ok: true;
      readonly action: ConciergeAction;
      readonly contextAfter: ConciergeContext;
      readonly message?: string;
      readonly data?: unknown;
    }
  | {
      readonly ok: false;
      readonly code: ToolErrorCode;
      readonly message: string;
    };

export interface ToolPropertyDescriptor {
  readonly type: "string" | "number" | "boolean";
  readonly description: string;
  readonly enum?: readonly string[];
}

export interface ToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: "object";
    readonly properties: Record<string, ToolPropertyDescriptor>;
    readonly required: readonly string[];
  };
}

export type ProviderDecision =
  | { readonly kind: "action"; readonly action: ConciergeAction; readonly thought?: string }
  | { readonly kind: "reply"; readonly message: string }
  | { readonly kind: "clarification"; readonly message: string }
  | { readonly kind: "unsupported"; readonly message: string };

export interface ConciergeProvider {
  readonly id: string;
  interpret(input: {
    readonly text: string;
    readonly context: ConciergeContext;
    readonly conversationState: ConversationState;
    readonly knowledgeStore: KnowledgeStore;
    readonly tools: readonly ToolDescriptor[];
    readonly signal?: AbortSignal;
  }): Promise<ProviderDecision>;
}

export interface SalesRoomAdapter {
  getContext(): ConciergeContext;
  execute(action: ConciergeAction): Promise<ToolResult>;
}

export interface ConciergeTurnResult {
  readonly text: string;
  readonly decision: ProviderDecision;
  readonly toolResult?: ToolResult;
  readonly contextBefore: ConciergeContext;
  readonly contextAfter: ConciergeContext;
  readonly conversationStateAfter: ConversationState;
}

export interface ConciergeEngine {
  getContext(): ConciergeContext;
  getConversationState(): ConversationState;
  getKnowledgeStore(): KnowledgeStore;
  handle(input: { text: string; signal?: AbortSignal }): Promise<ConciergeTurnResult>;
  executeAction(action: ConciergeAction): Promise<ToolResult>;
}

// Presentation Director Contracts
export type PresentationState =
  | "idle"
  | "presenting"
  | "paused"
  | "handling_interruption"
  | "completed"
  | "error";

export interface PresentationStep {
  readonly id: string;
  readonly order: number;
  readonly title: { readonly es: string; readonly en: string };
  readonly narration: { readonly es: string; readonly en: string };
  readonly visualAction?: ConciergeAction;
  readonly nextStepId: string | null;
}

export interface NarrationSink {
  speak(text: string, signal?: AbortSignal): Promise<{ completed: boolean; aborted: boolean }>;
  stop(): void;
}

export interface PresentationDirectorStatus {
  readonly state: PresentationState;
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly currentStep: PresentationStep | null;
  readonly resumedFromStepId: string | null;
}
