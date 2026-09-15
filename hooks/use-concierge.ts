import { useCallback, useMemo, useState } from "react";
import type {
  AmenityId,
  Currency,
  ExperienceView,
  Language,
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
  type ConciergeAction,
  type ConciergeContext,
  type ConciergeEngine,
  type NarrationSink,
  type PresentationDirector,
  type PresentationDirectorStatus,
  type ToolResult,
} from "../lib/concierge";

export interface UseConciergeProps {
  residences: readonly Residence[];
  selectedId: UnitId | null;
  view: ViewId;
  exploring: boolean;
  inventoryOpen: boolean;
  interiorOpen: boolean;
  experienceView: ExperienceView;
  selectedAmenityId: AmenityId | null;
  generalPlansOpen: boolean;
  generalPlanIndex: number;
  totalGeneralPlans: number;
  language: Language;
  currency: Currency;
  mxnPerUsd: number;
  syncStatus: "synced" | "loading" | "unavailable" | "error" | "unknown";
  updatedAt: string | null;

  selectResidence: (id: UnitId) => void;
  setFacade: (facade: ViewId) => void;
  openInventory: () => void;
  closeInventory: () => void;
  openFloorPlan: (id: UnitId) => void;
  closeExperience: () => void;
  showAmenity: (amenityId: AmenityId) => void;
  openTour: (id: UnitId) => void;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  appendChatMessage: (author: "visitor" | "concierge", text: string) => void;
}

export interface UseConciergeReturn {
  engine: ConciergeEngine;
  director: PresentationDirector;
  directorStatus: PresentationDirectorStatus;
  ask: (text: string) => Promise<void>;
  startPresentation: () => Promise<void>;
  nextPresentationStep: () => Promise<void>;
  pausePresentation: () => void;
  resumePresentation: () => Promise<void>;
  stopPresentation: () => void;
  notifyManualNavigation: () => void;
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
    case "open_tour":
      return es ? `Abrí el recorrido virtual 360° de la Residencia ${action.residenceId}.` : `Opened 360° virtual tour for Residence ${action.residenceId}.`;
    case "set_language":
      return action.language === "es" ? "Idioma cambiado a español." : "Language changed to English.";
    case "set_currency":
      return action.currency === "USD"
        ? (es ? "Mostrando precios en dólares (USD)." : "Showing prices in US Dollars (USD).")
        : (es ? "Mostrando precios en pesos mexicanos (MXN)." : "Showing prices in Mexican Pesos (MXN).");
  }
}

export function useConcierge(props: UseConciergeProps): UseConciergeReturn {
  const [directorStatus, setDirectorStatus] = useState<PresentationDirectorStatus>({
    state: "idle",
    currentStepIndex: 0,
    totalSteps: 6,
    currentStep: null,
    resumedFromStepId: null,
  });

  const getFreshContext = useCallback((): ConciergeContext => {
    return buildConciergeContext({
      residences: props.residences,
      selectedId: props.selectedId,
      view: props.view,
      exploring: props.exploring,
      inventoryOpen: props.inventoryOpen,
      interiorOpen: props.interiorOpen,
      experienceView: props.experienceView,
      selectedAmenityId: props.selectedAmenityId,
      generalPlansOpen: props.generalPlansOpen,
      generalPlanIndex: props.generalPlanIndex,
      totalGeneralPlans: props.totalGeneralPlans,
      language: props.language,
      currency: props.currency,
      mxnPerUsd: props.mxnPerUsd,
      syncStatus: props.syncStatus,
      updatedAt: props.updatedAt,
    });
  }, [props]);

  const narrationSink: NarrationSink = useMemo(() => ({
    speak: async (text: string, signal?: AbortSignal) => {
      if (signal?.aborted) return { completed: false, aborted: true };
      props.appendChatMessage("concierge", text);
      return { completed: true, aborted: false };
    },
    stop: () => {},
  }), [props]);

  const adapter = useMemo(() => {
    return createSalesRoomAdapter({
      getContext: () => getFreshContext(),
      selectResidence: (id) => props.selectResidence(id),
      setFacade: (facade) => props.setFacade(facade),
      openInventory: () => props.openInventory(),
      closeInventory: () => props.closeInventory(),
      openFloorPlan: (id) => props.openFloorPlan(id),
      closeExperience: () => props.closeExperience(),
      showAmenity: (amenityId) => props.showAmenity(amenityId),
      openTour: (id) => props.openTour(id),
      setLanguage: (lang) => props.setLanguage(lang),
      setCurrency: (curr) => props.setCurrency(curr),
    });
  }, [getFreshContext, props]);

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
      onStateChange: (status) => setDirectorStatus(status),
    });
  }, [engine, narrationSink]);

  const ask = useCallback(async (raw: string) => {
    const clean = raw.trim().slice(0, 1000);
    if (!clean) return;

    props.appendChatMessage("visitor", clean);

    // If presenting, interrupt the tour
    if (director.getStatus().state === "presenting") {
      director.interrupt();
    }

    // Check if user requested to resume presentation
    const normalized = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/\b(?:continua|reanuda|sigue|continue|resume)\b/.test(normalized) && /\b(?:presentacion|tour|recorrido)\b/.test(normalized)) {
      await director.resume();
      return;
    }

    const turn = await engine.handle({ text: clean });
    const currentLang = props.language;

    if (turn.decision.kind === "action" && turn.toolResult) {
      const confirmation = formatActionConfirmation(turn.decision.action, turn.toolResult, currentLang);
      props.appendChatMessage("concierge", confirmation);
    } else if (turn.decision.kind === "reply" || turn.decision.kind === "clarification" || turn.decision.kind === "unsupported") {
      props.appendChatMessage("concierge", turn.decision.message);
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
  }, [director]);

  const notifyManualNavigation = useCallback(() => {
    director.onManualNavigation();
  }, [director]);

  return {
    engine,
    director,
    directorStatus,
    ask,
    startPresentation,
    nextPresentationStep,
    pausePresentation,
    resumePresentation,
    stopPresentation,
    notifyManualNavigation,
  };
}
