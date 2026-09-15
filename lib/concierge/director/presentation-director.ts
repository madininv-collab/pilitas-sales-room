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
  readonly autoAdvance?: boolean;
  readonly autoAdvanceDelayMs?: number;
  readonly isTyping?: () => boolean;
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
  const autoAdvance = config.autoAdvance ?? true;
  const baseAutoAdvanceDelayMs = config.autoAdvanceDelayMs ?? 5500;
  const isTyping = config.isTyping;

  let state: PresentationState = "idle";
  let currentStepIndex = 0;
  let resumedFromStepId: string | null = null;
  let currentAbortController: AbortController | null = null;
  let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  function clearAutoAdvanceTimer(): void {
    if (autoAdvanceTimer !== null) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  }

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
      isAutoAdvancing: autoAdvanceTimer !== null,
    };
  }

  function calculateReadingDelay(text: string): number {
    // Average reading speed: ~200 words per minute (~300ms per word), minimum 4500ms
    const words = text.trim().split(/\s+/).length;
    return Math.max(4500, Math.min(10000, words * 280));
  }

  function scheduleAutoAdvance(delayMs: number): void {
    clearAutoAdvanceTimer();
    if (!autoAdvance || state !== "presenting") return;

    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null;
      if (state !== "presenting") return;

      // If visitor is currently typing a question, hold and re-check shortly
      if (isTyping && isTyping()) {
        scheduleAutoAdvance(2000);
        return;
      }

      void nextStepInternal();
    }, delayMs);

    notifyState();
  }

  async function executeCurrentStep(): Promise<PresentationStep | null> {
    clearAutoAdvanceTimer();

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

    // 3. Execute contextual highlight if configured
    if (step.highlightAction && !signal.aborted) {
      await engine.executeAction(step.highlightAction);
    }

    // 4. Confirm presentation is still active after visual transition
    if (state !== "presenting" || signal.aborted) {
      return null;
    }

    // 5. Narrate step explanation (verifying live inventory status if residence step)
    const currentContext = engine.getContext();
    const lang = currentContext.project.language;
    let textToSpeak = step.narration[lang];

    if (step.id === "show_residence") {
      const unit = currentContext.inventory.residences.find((r) => r.id === "401");
      if (unit && unit.status !== "Disponible") {
        if (unit.status === "Apartada") {
          textToSpeak = lang === "es"
            ? "Esta es la Residencia 401 en el cuarto nivel: una recámara, un baño y 76.90 m². Esta unidad se encuentra apartada, presentándose como muestra de esta tipología."
            : "This is Residence 401 on the fourth level: one bedroom, one bath, and 76.90 m². This unit is currently reserved, presented as a model for this layout.";
        } else if (unit.status === "Vendida") {
          textToSpeak = lang === "es"
            ? "Esta es la Residencia 401 en el cuarto nivel: una recámara, un baño y 76.90 m². Esta unidad ya fue vendida, mostrándose como referencia de diseño y acabados."
            : "This is Residence 401 on the fourth level: one bedroom, one bath, and 76.90 m². This unit is already sold, shown as a design and finish reference.";
        }
      }
    }

    if (sink) {
      const narrationResult = await sink.speak(textToSpeak, signal);
      if (narrationResult.aborted || signal.aborted) {
        return null;
      }
    }

    notifyState();

    // 6. Autonomous auto-advance if presenting and next step exists
    if (state === "presenting" && !signal.aborted && step.nextStepId) {
      const delay = step.pauseDurationMs ?? Math.max(baseAutoAdvanceDelayMs, calculateReadingDelay(textToSpeak));
      scheduleAutoAdvance(delay);
    } else if (!step.nextStepId) {
      state = "completed";
      notifyState();
    }

    return step;
  }

  async function nextStepInternal(): Promise<PresentationStep | null> {
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
    clearAutoAdvanceTimer();
    notifyState();
    return null;
  }

  return {
    getStatus,

    async start(): Promise<PresentationStep | null> {
      clearAutoAdvanceTimer();
      state = "presenting";
      currentStepIndex = 0;
      resumedFromStepId = null;
      notifyState();
      return executeCurrentStep();
    },

    async nextStep(): Promise<PresentationStep | null> {
      clearAutoAdvanceTimer();
      return nextStepInternal();
    },

    pause(): void {
      if (state === "presenting") {
        state = "paused";
        clearAutoAdvanceTimer();
        currentAbortController?.abort();
        sink?.stop();
        notifyState();
      }
    },

    async resume(): Promise<PresentationStep | null> {
      if (state === "paused" || state === "handling_interruption") {
        clearAutoAdvanceTimer();
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
        clearAutoAdvanceTimer();
        currentAbortController?.abort();
        sink?.stop();
        notifyState();
      }
    },

    stop(): void {
      state = "idle";
      currentStepIndex = 0;
      resumedFromStepId = null;
      clearAutoAdvanceTimer();
      currentAbortController?.abort();
      sink?.stop();
      notifyState();
    },

    onManualNavigation(): void {
      if (state === "presenting" || state === "handling_interruption") {
        state = "paused";
        clearAutoAdvanceTimer();
        currentAbortController?.abort();
        sink?.stop();
        notifyState();
      }
    },
  };
}
