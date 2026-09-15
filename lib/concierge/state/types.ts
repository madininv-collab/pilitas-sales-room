import type { UnitId, AmenityId, Language, Currency } from "../../pilitas/types";

export interface VisitorPreferences {
  readonly language: Language;
  readonly currency: Currency;
  readonly budgetMaxUsd?: number;
  readonly bedrooms?: 1 | 2;
  readonly preferredView?: "ocean" | "street" | "rooftop";
  readonly intent?: "investment" | "lifestyle_residence" | "vacation_home" | "exploring";
}

export interface EngagementMetrics {
  readonly unitsShown: readonly UnitId[];
  readonly amenitiesConsulted: readonly AmenityId[];
  readonly toursOpened: readonly UnitId[];
  readonly floorPlansOpened: readonly UnitId[];
  readonly pendingQuestions: readonly string[];
  readonly purchaseIntentScore: "low" | "medium" | "high";
}

export interface InterruptionBookmark {
  readonly stepId: string;
  readonly stepIndex: number;
  readonly timestamp: string;
}

export interface InterruptionRecord {
  readonly stepId: string;
  readonly userQuery: string;
  readonly timestamp: string;
}

export interface PresentationProgress {
  readonly mode: "open_qa" | "guided_presentation";
  readonly currentStepId: string | null;
  readonly pausedAtStepId: string | null;
  readonly interruptionBookmark: InterruptionBookmark | null;
  readonly interruptionHistory: readonly InterruptionRecord[];
}

export interface HumanHandoffStatus {
  readonly requested: boolean;
  readonly reason?: string;
  readonly preferredChannel?: "whatsapp" | "email" | "appointment";
  readonly contactNotes?: string;
}

export interface ConversationState {
  readonly visitorPreferences: VisitorPreferences;
  readonly engagement: EngagementMetrics;
  readonly presentationProgress: PresentationProgress;
  readonly handoffStatus: HumanHandoffStatus;
}
