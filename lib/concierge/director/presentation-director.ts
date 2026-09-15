import type {
  ConciergeEngine,
  NarrationSink,
  PresentationDirectorStatus,
  PresentationState,
  PresentationStep,
} from "../contracts";
import { PILITAS_PRESENTATION_SCRIPT } from "./presentation-script";

export interface PresentationDirectorConfig {
  readonly engine: ConciergeEngine;
  readonly script?: readonly PresentationStep[];
  readonly narrationSink?: NarrationSink;
  readonly onStateChange?: (status: PresentationDirectorStatus) => void;
}

export interface PresentationDirector {
  getStatus(): PresentationDirectorStatus;
  start(): Promise<PresentationStep | null>;
  nextStep(): Promise<PresentationStep | null>;
  pause(): void;
  resume(): Promise<PresentationStep | null>;
  interrupt(): void;
  stop(): void;
  onManualNavigation(): void;
}

export function createPresentationDirector(config: PresentationDirectorConfig): PresentationDirector {
  const engine = config.engine;
  const script = config.script ?? PILITAS_PRESENTATION_SCRIPT;
  const sink = config.narrationSink;
  const onStateChange = config.onStateChange;

  let state: PresentationState = "idle";
  let currentStepIndex = 0;
  let resumedFromStepId: string | null = null;
  let currentAbortController: AbortController | null = null;

  function notifyState(): void {
    if (onStateChange) {
      onStateChange(getStatus());
    }
  }

  function getStatus(): PresentationDirectorStatus {
    const currentStep = state !== "idle" && state !== "completed" && state !== "error" && currentStepIndex < script.length
      ? script[currentStepIndex]
      : null;

    return {
      state,
      currentStepIndex,
      totalSteps: script.length,
      currentStep,
      resumedFromStepId,
    };
  }

  async function executeCurrentStep(): Promise<PresentationStep | null> {
    if (currentStepIndex >= script.length) {
      state = "completed";
      notifyState();
      return null;
    }

    const step = script[currentStepIndex];

    // 1. Check that presentation is still active
    if (state !== "presenting") {
      return null;
    }

    currentAbortController?.abort();
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    // 2. Execute visual action first (Show before Explain)
    if (step.visualAction) {
      const toolResult = await engine.executeAction(step.visualAction);
      if (!toolResult.ok) {
        state = "error";
        notifyState();
        return null;
      }
    }

    // 3. Confirm presentation is still active after visual transition
    if (state !== "presenting" || signal.aborted) {
      return null;
    }

    // 4. Narrate step explanation
    const currentContext = engine.getContext();
    const lang = currentContext.project.language;
    const textToSpeak = step.narration[lang];

    if (sink) {
      await sink.speak(textToSpeak, signal);
    }

    notifyState();
    return step;
  }

  return {
    getStatus,

    async start(): Promise<PresentationStep | null> {
      state = "presenting";
      currentStepIndex = 0;
      resumedFromStepId = null;
      notifyState();
      return executeCurrentStep();
    },

    async nextStep(): Promise<PresentationStep | null> {
      if (state !== "presenting" && state !== "paused") {
        return null;
      }

      if (currentStepIndex + 1 < script.length) {
        currentStepIndex += 1;
        state = "presenting";
        notifyState();
        return executeCurrentStep();
      }

      state = "completed";
      notifyState();
      return null;
    },

    pause(): void {
      if (state === "presenting") {
        state = "paused";
        currentAbortController?.abort();
        sink?.stop();
        notifyState();
      }
    },

    async resume(): Promise<PresentationStep | null> {
      if (state === "paused" || state === "handling_interruption") {
        resumedFromStepId = script[currentStepIndex]?.id ?? null;
        state = "presenting";
        notifyState();
        return executeCurrentStep();
      }
      return null;
    },

    interrupt(): void {
      if (state === "presenting") {
        state = "handling_interruption";
        currentAbortController?.abort();
        sink?.stop();
        notifyState();
      }
    },

    stop(): void {
      state = "idle";
      currentStepIndex = 0;
      resumedFromStepId = null;
      currentAbortController?.abort();
      sink?.stop();
      notifyState();
    },

    onManualNavigation(): void {
      if (state === "presenting" || state === "handling_interruption") {
        state = "paused";
        currentAbortController?.abort();
        sink?.stop();
        notifyState();
      }
    },
  };
}
