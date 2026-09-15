/* eslint-disable react-hooks/refs */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AmenityId,
  Currency,
  ExperienceView,
  Language,
  PlanView,
  Residence,
  UnitId,
  ViewId,
} from "../lib/pilitas/types";
import {
  buildConciergeContext,
  createConciergeEngine,
  createPresentationDirector,
  createSalesRoomAdapter,
  localParserProvider,
  type ActiveHighlight,
  type ConciergeAction,
  type ConciergeContext,
  type ConciergeEngine,
  type NarrationSink,
  type PresentationDirector,
  type PresentationDirectorStatus,
  type ToolResult,
} from "../lib/concierge";
import {
  clearSessionState,
  createInitialConversationState,
  loadSessionState,
  recordAmenityConsulted,
  recordFloorPlanOpened,
  recordInterruption,
  recordTourOpened,
  recordUnitShown,
  saveSessionState,
  type ConversationState,
} from "../lib/concierge/state";

export interface UseConciergeProps {
  residences: readonly Residence[];
  selectedId: UnitId | null;
  view: ViewId;
  exploring: boolean;
  inventoryOpen: boolean;
  mapOpen?: boolean;
  interiorOpen: boolean;
  experienceView: ExperienceView;
  selectedAmenityId: AmenityId | null;
  generalPlansOpen: boolean;
  generalPlanIndex: number;
  totalGeneralPlans: number;
  planView?: PlanView;
  galleryIndex?: number;
  totalGalleryImages?: number;
  activeHighlight?: ActiveHighlight | null;
  isTyping?: boolean;
  language: Language;
  currency: Currency;
  mxnPerUsd: number;
  syncStatus: "synced" | "loading" | "unavailable" | "error" | "unknown";
  updatedAt: string | null;
  voiceInputAvailable?: boolean;
  voiceOutputAvailable?: boolean;

  selectResidence: (id: UnitId) => void;
  setFacade: (facade: ViewId) => void;
  openInventory: () => void;
  closeInventory: () => void;
  openFloorPlan: (id: UnitId, view?: PlanView) => void;
  closeExperience: () => void;
  showAmenity: (amenityId: AmenityId) => void;
  openTour: (id: UnitId) => void;
  openMap?: () => void;
  closeMap?: () => void;
  openGeneralPlans?: (index?: number) => void;
  setGeneralPlanIndex?: (index: number) => void;
  closeGeneralPlans?: () => void;
  setPlanView?: (view: PlanView) => void;
  openInteriorGallery?: (id: UnitId, index?: number) => void;
  setGalleryIndex?: (index: number) => void;
  setHighlight?: (highlight: ActiveHighlight) => void;
  clearHighlight?: () => void;
  closeTour?: () => void;
  closeAmenity?: () => void;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  appendChatMessage: (author: "visitor" | "concierge", text: string) => void;
  requestHumanHandoff?: (reason: string, preferredChannel?: "whatsapp" | "email" | "appointment") => void;
}

export interface UseConciergeReturn {
  engine: ConciergeEngine;
  director: PresentationDirector;
  directorStatus: PresentationDirectorStatus;
  conversationState: ConversationState;
  ask: (text: string) => Promise<void>;
  startPresentation: () => Promise<void>;
  nextPresentationStep: () => Promise<void>;
  pausePresentation: () => void;
  resumePresentation: () => Promise<void>;
  stopPresentation: () => void;
  notifyManualNavigation: () => void;
  resetSession: () => void;
}

function formatActionConfirmation(action: ConciergeAction, result: ToolResult, language: Language): string {
  const es = language === "es";
  if (!result.ok) {
    return result.message;
  }

  switch (action.type) {
    case "select_residence":
      return es ? `Seleccioné la Residencia ${action.residenceId}.` : `Selected Residence ${action.residenceId}.`;
    case "set_facade":
      return es
        ? `Cambié a la fachada ${action.facade === "front" ? "principal" : "posterior"}.`
        : `Switched to the ${action.facade === "front" ? "front" : "rear"} facade.`;
    case "open_inventory":
      return es ? "Abrí el inventario de residencias." : "Opened the residences inventory.";
    case "close_inventory":
      return es ? "Cerré el inventario." : "Closed the inventory.";
    case "open_floor_plan":
      return es ? `Abrí el plano de la Residencia ${action.residenceId}.` : `Opened floor plan for Residence ${action.residenceId}.`;
    case "close_floor_plan":
      return es ? "Cerré el plano arquitectónico." : "Closed the floor plan.";
    case "show_amenity":
      return es ? `Mostrando ${action.amenityId === "lobby" ? "el Lobby" : "el Rooftop"}.` : `Showing ${action.amenityId === "lobby" ? "the Lobby" : "the Rooftop"}.`;
    case "close_amenity":
      return es ? "Cerré la vista de la amenidad." : "Closed the amenity view.";
    case "open_tour":
      return es ? `Abrí el recorrido virtual 360° de la Residencia ${action.residenceId}.` : `Opened 360° virtual tour for Residence ${action.residenceId}.`;
    case "close_tour":
      return es ? "Cerré el recorrido virtual." : "Closed the virtual tour.";
    case "open_map":
      return es ? "Abrí el mapa del vecindario de Olas Altas." : "Opened the Olas Altas neighborhood map.";
    case "close_map":
      return es ? "Cerré el mapa." : "Closed the map.";
    case "open_general_plans":
      return es ? "Abrí los planos generales del edificio." : "Opened the building general plans.";
    case "set_general_plan_index":
      return es ? `Mostrando plano general nivel ${action.index + 1}.` : `Showing general plan level ${action.index + 1}.`;
    case "close_general_plans":
      return es ? "Cerré los planos generales." : "Closed the general plans.";
    case "set_plan_view":
      return es
        ? `Cambié la vista de plano a: ${action.view === "color" ? "amueblado a color" : action.view === "clean" ? "sin cotas" : "con cotas"}.`
        : `Switched floor plan view to: ${action.view}.`;
    case "open_interior_gallery":
      return es ? `Abrí la galería de interiores de la Residencia ${action.residenceId}.` : `Opened interior gallery for Residence ${action.residenceId}.`;
    case "set_gallery_index":
      return es ? `Mostrando fotografía ${action.index + 1}.` : `Showing photograph ${action.index + 1}.`;
    case "set_highlight":
      return es ? `Resalté el elemento en pantalla.` : `Highlighted element on screen.`;
    case "clear_highlight":
      return es ? "Retiré el resaltado." : "Cleared highlight.";
    case "set_language":
      return action.language === "es" ? "Idioma cambiado a español." : "Language changed to English.";
    case "set_currency":
      return action.currency === "USD"
        ? (es ? "Mostrando precios en dólares (USD)." : "Showing prices in US Dollars (USD).")
        : (es ? "Mostrando precios en pesos mexicanos (MXN)." : "Showing prices in Mexican Pesos (MXN).");
    case "list_units":
      return es ? "Consulté el inventario de residencias." : "Retrieved residences inventory.";
    case "get_unit_details":
      return es ? `Consulté los detalles de la Residencia ${action.residenceId}.` : `Retrieved details for Residence ${action.residenceId}.`;
    case "get_project_information":
      return es ? "Consulté la información verificada del proyecto." : "Retrieved verified project information.";
    case "request_human_handoff": {
      const channelLabel = action.preferredChannel === "email" ? "correo" : "WhatsApp";
      return es
        ? `Preparé un enlace directo vía ${channelLabel} con el equipo de ventas para: "${action.reason}". Puedes pulsar el enlace abajo para iniciar la conversación.`
        : `Prepared a direct ${action.preferredChannel === "email" ? "email" : "WhatsApp"} link with sales for: "${action.reason}". Click below to start the conversation.`;
    }
  }
}

export function useConcierge(props: UseConciergeProps): UseConciergeReturn {
  const [directorStatus, setDirectorStatus] = useState<PresentationDirectorStatus>({
    state: "idle",
    currentStepIndex: 0,
    totalSteps: 6,
    currentStep: null,
    resumedFromStepId: null,
    isAutoAdvancing: false,
  });

  const [conversationState, setConversationState] = useState<ConversationState>(() => {
    const saved = loadSessionState();
    return saved ?? createInitialConversationState(props.language, props.currency);
  });

  // Save session state to sessionStorage on state updates
  useEffect(() => {
    saveSessionState(conversationState);
  }, [conversationState]);

  const propsRef = useRef(props);
  propsRef.current = props;

  const getFreshContext = useCallback((): ConciergeContext => {
    const p = propsRef.current;
    return buildConciergeContext({
      residences: p.residences,
      selectedId: p.selectedId,
      view: p.view,
      exploring: p.exploring,
      inventoryOpen: p.inventoryOpen,
      mapOpen: p.mapOpen,
      interiorOpen: p.interiorOpen,
      experienceView: p.experienceView,
      selectedAmenityId: p.selectedAmenityId,
      generalPlansOpen: p.generalPlansOpen,
      generalPlanIndex: p.generalPlanIndex,
      totalGeneralPlans: p.totalGeneralPlans,
      planView: p.planView,
      galleryIndex: p.galleryIndex,
      totalGalleryImages: p.totalGalleryImages,
      activeHighlight: p.activeHighlight,
      isTyping: p.isTyping,
      language: p.language,
      currency: p.currency,
      mxnPerUsd: p.mxnPerUsd,
      syncStatus: p.syncStatus,
      updatedAt: p.updatedAt,
      voiceInputAvailable: p.voiceInputAvailable,
      voiceOutputAvailable: p.voiceOutputAvailable,
    });
  }, []);

  const narrationSink: NarrationSink = useMemo(() => ({
    speak: async (text: string, signal?: AbortSignal) => {
      if (signal?.aborted) return { completed: false, aborted: true };
      const p = propsRef.current;
      p.appendChatMessage("concierge", text);

      // If browser SpeechSynthesis is enabled and supported, speak and wait for completion before advancing
      if (typeof window !== "undefined" && "speechSynthesis" in window && p.voiceOutputAvailable) {
        return new Promise<{ completed: boolean; aborted: boolean }>((resolve) => {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = p.language === "es" ? "es-MX" : "en-US";
            utterance.rate = 1.0;

            let finished = false;
            const finish = (completed: boolean, aborted: boolean) => {
              if (finished) return;
              finished = true;
              if (signal) signal.removeEventListener("abort", onAbort);
              resolve({ completed, aborted });
            };

            const onAbort = () => {
              if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
              }
              finish(false, true);
            };

            if (signal) {
              if (signal.aborted) {
                return finish(false, true);
              }
              signal.addEventListener("abort", onAbort, { once: true });
            }

            utterance.onend = () => finish(true, false);
            utterance.onerror = (e) => {
              const wasCanceled = e.error === "canceled" || e.error === "interrupted";
              finish(false, wasCanceled);
            };

            // Safety timeout based on word count (never hang indefinitely)
            const words = text.trim().split(/\s+/).length;
            const maxDurationMs = Math.max(5000, words * 500 + 4000);
            setTimeout(() => {
              if (!finished) finish(true, false);
            }, maxDurationMs);

            window.speechSynthesis.speak(utterance);
          } catch {
            resolve({ completed: true, aborted: false });
          }
        });
      }

      return { completed: true, aborted: false };
    },
    stop: () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
  }), []);

  const adapter = useMemo(() => {
    return createSalesRoomAdapter({
      getContext: () => getFreshContext(),
      selectResidence: (id) => {
        setConversationState((prev) => recordUnitShown(prev, id));
        propsRef.current.selectResidence(id);
      },
      setFacade: (facade) => propsRef.current.setFacade(facade),
      openInventory: () => propsRef.current.openInventory(),
      closeInventory: () => propsRef.current.closeInventory(),
      openFloorPlan: (id, view) => {
        setConversationState((prev) => recordFloorPlanOpened(prev, id));
        propsRef.current.openFloorPlan(id, view);
      },
      closeExperience: () => {
        propsRef.current.closeExperience();
        propsRef.current.clearHighlight?.();
      },
      setPlanView: (view) => propsRef.current.setPlanView?.(view),
      showAmenity: (amenityId) => {
        setConversationState((prev) => recordAmenityConsulted(prev, amenityId));
        propsRef.current.showAmenity(amenityId);
      },
      closeAmenity: () => {
        propsRef.current.closeAmenity?.();
        propsRef.current.clearHighlight?.();
      },
      openTour: (id) => {
        setConversationState((prev) => recordTourOpened(prev, id));
        propsRef.current.openTour(id);
      },
      closeTour: () => {
        propsRef.current.closeTour?.();
        propsRef.current.clearHighlight?.();
      },
      openMap: () => propsRef.current.openMap?.(),
      closeMap: () => propsRef.current.closeMap?.(),
      openGeneralPlans: (idx) => propsRef.current.openGeneralPlans?.(idx),
      setGeneralPlanIndex: (idx) => propsRef.current.setGeneralPlanIndex?.(idx),
      closeGeneralPlans: () => {
        propsRef.current.closeGeneralPlans?.();
        propsRef.current.clearHighlight?.();
      },
      openInteriorGallery: (id, idx) => propsRef.current.openInteriorGallery?.(id, idx),
      setGalleryIndex: (idx) => propsRef.current.setGalleryIndex?.(idx),
      setHighlight: (highlight) => propsRef.current.setHighlight?.(highlight),
      clearHighlight: () => propsRef.current.clearHighlight?.(),
      setLanguage: (lang) => propsRef.current.setLanguage(lang),
      setCurrency: (curr) => propsRef.current.setCurrency(curr),
      requestHumanHandoff: (reason, channel) => propsRef.current.requestHumanHandoff?.(reason, channel),
    });
  }, [getFreshContext]);

  const engine = useMemo(() => {
    return createConciergeEngine({
      provider: localParserProvider,
      salesRoom: adapter,
    });
  }, [adapter]);

  const director = useMemo(() => {
    return createPresentationDirector({
      engine,
      narrationSink,
      autoAdvance: true,
      isTyping: () => Boolean(propsRef.current.isTyping),
      onStateChange: (status) => setDirectorStatus(status),
    });
  }, [engine, narrationSink]);

  const ask = useCallback(async (raw: string) => {
    const clean = raw.trim().slice(0, 1000);
    if (!clean) return;

    props.appendChatMessage("visitor", clean);

    const wasPresenting = director.getStatus().state === "presenting";
    const currentStep = director.getStatus().currentStep;

    // If presenting, interrupt tour and save bookmark
    if (wasPresenting && currentStep) {
      director.interrupt();
      setConversationState((prev) =>
        recordInterruption(prev, currentStep.id, director.getStatus().currentStepIndex, clean)
      );
    }

    // Check if visitor requested to resume presentation
    const normalized = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/\b(?:continua|reanuda|sigue|continue|resume)\b/.test(normalized) && /\b(?:presentacion|tour|recorrido|visita)\b/.test(normalized)) {
      await director.resume();
      return;
    }

    const turn = await engine.handle({ text: clean });
    const currentLang = props.language;

    if (turn.decision.kind === "action" && turn.toolResult) {
      const confirmation = formatActionConfirmation(turn.decision.action, turn.toolResult, currentLang);
      props.appendChatMessage("concierge", confirmation);
    } else if (turn.decision.kind === "reply" || turn.decision.kind === "clarification" || turn.decision.kind === "unsupported") {
      let replyMessage = turn.decision.message;
      // If we interrupted a presentation, append a polite resumption prompt
      if (wasPresenting) {
        replyMessage += currentLang === "es"
          ? "\n\n¿Deseas que continuemos con la visita guiada donde nos quedamos?"
          : "\n\nWould you like to resume the guided tour where we left off?";
      }
      props.appendChatMessage("concierge", replyMessage);
    }
  }, [director, engine, props]);

  const startPresentation = useCallback(async () => {
    await director.start();
  }, [director]);

  const nextPresentationStep = useCallback(async () => {
    await director.nextStep();
  }, [director]);

  const pausePresentation = useCallback(() => {
    director.pause();
  }, [director]);

  const resumePresentation = useCallback(async () => {
    await director.resume();
  }, [director]);

  const stopPresentation = useCallback(() => {
    director.stop();
    props.clearHighlight?.();
  }, [director, props]);

  const notifyManualNavigation = useCallback(() => {
    director.onManualNavigation();
    props.clearHighlight?.();
  }, [director, props]);

  const resetSession = useCallback(() => {
    clearSessionState();
    director.stop();
    props.clearHighlight?.();
    setConversationState(createInitialConversationState(props.language, props.currency));
  }, [director, props]);

  return {
    engine,
    director,
    directorStatus,
    conversationState,
    ask,
    startPresentation,
    nextPresentationStep,
    pausePresentation,
    resumePresentation,
    stopPresentation,
    notifyManualNavigation,
    resetSession,
  };
}
