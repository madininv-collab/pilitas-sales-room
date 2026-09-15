import type { UnitId, AmenityId, Language, Currency } from "../../pilitas/types";
import type {
  ConversationState,
  VisitorPreferences,
} from "./types";

export function createInitialConversationState(
  language: Language = "es",
  currency: Currency = "USD"
): ConversationState {
  return {
    visitorPreferences: {
      language,
      currency,
    },
    engagement: {
      unitsShown: [],
      amenitiesConsulted: [],
      toursOpened: [],
      floorPlansOpened: [],
      pendingQuestions: [],
      purchaseIntentScore: "low",
    },
    presentationProgress: {
      mode: "open_qa",
      currentStepId: null,
      pausedAtStepId: null,
      interruptionBookmark: null,
      interruptionHistory: [],
    },
    handoffStatus: {
      requested: false,
    },
  };
}

export function updatePreferences(
  state: ConversationState,
  updates: Partial<VisitorPreferences>
): ConversationState {
  return {
    ...state,
    visitorPreferences: {
      ...state.visitorPreferences,
      ...updates,
    },
  };
}

export function recordUnitShown(
  state: ConversationState,
  unitId: UnitId
): ConversationState {
  if (state.engagement.unitsShown.includes(unitId)) return state;
  const newUnits = [...state.engagement.unitsShown, unitId];
  return {
    ...state,
    engagement: {
      ...state.engagement,
      unitsShown: newUnits,
      purchaseIntentScore: newUnits.length >= 3 ? "high" : newUnits.length >= 1 ? "medium" : "low",
    },
  };
}

export function recordAmenityConsulted(
  state: ConversationState,
  amenityId: AmenityId
): ConversationState {
  if (state.engagement.amenitiesConsulted.includes(amenityId)) return state;
  return {
    ...state,
    engagement: {
      ...state.engagement,
      amenitiesConsulted: [...state.engagement.amenitiesConsulted, amenityId],
    },
  };
}

export function recordTourOpened(
  state: ConversationState,
  unitId: UnitId
): ConversationState {
  if (state.engagement.toursOpened.includes(unitId)) return state;
  return {
    ...state,
    engagement: {
      ...state.engagement,
      toursOpened: [...state.engagement.toursOpened, unitId],
    },
  };
}

export function recordFloorPlanOpened(
  state: ConversationState,
  unitId: UnitId
): ConversationState {
  if (state.engagement.floorPlansOpened.includes(unitId)) return state;
  return {
    ...state,
    engagement: {
      ...state.engagement,
      floorPlansOpened: [...state.engagement.floorPlansOpened, unitId],
    },
  };
}

export function recordInterruption(
  state: ConversationState,
  stepId: string,
  stepIndex: number,
  userQuery: string
): ConversationState {
  const timestamp = new Date().toISOString();
  return {
    ...state,
    presentationProgress: {
      ...state.presentationProgress,
      pausedAtStepId: stepId,
      interruptionBookmark: {
        stepId,
        stepIndex,
        timestamp,
      },
      interruptionHistory: [
        ...state.presentationProgress.interruptionHistory,
        { stepId, userQuery, timestamp },
      ],
    },
  };
}

export function clearInterruptionBookmark(
  state: ConversationState
): ConversationState {
  return {
    ...state,
    presentationProgress: {
      ...state.presentationProgress,
      interruptionBookmark: null,
      pausedAtStepId: null,
    },
  };
}

export function recordPendingQuestion(
  state: ConversationState,
  question: string
): ConversationState {
  return {
    ...state,
    engagement: {
      ...state.engagement,
      pendingQuestions: [...state.engagement.pendingQuestions, question],
    },
  };
}

export function requestHandoff(
  state: ConversationState,
  reason: string,
  preferredChannel?: "whatsapp" | "email" | "appointment",
  contactNotes?: string
): ConversationState {
  return {
    ...state,
    handoffStatus: {
      requested: true,
      reason,
      preferredChannel,
      contactNotes,
    },
  };
}

export function setPresentationMode(
  state: ConversationState,
  mode: "open_qa" | "guided_presentation",
  currentStepId?: string | null
): ConversationState {
  return {
    ...state,
    presentationProgress: {
      ...state.presentationProgress,
      mode,
      currentStepId: currentStepId !== undefined ? currentStepId : state.presentationProgress.currentStepId,
    },
  };
}

export const CONCIERGE_SESSION_STORAGE_KEY = "algo_concierge_session_v2";

export function loadSessionState(): ConversationState | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const serialized = window.sessionStorage.getItem(CONCIERGE_SESSION_STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized) as ConversationState;
  } catch {
    return null;
  }
}

export function saveSessionState(state: ConversationState): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(CONCIERGE_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

export function clearSessionState(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(CONCIERGE_SESSION_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
