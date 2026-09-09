"use client";

/* eslint-disable @next/next/no-img-element -- Native images preserve exact architectural alignment and original asset quality. */

import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Layers3,
  Languages,
  MapPin,
  Maximize2,
  MessageCircle,
  MoveHorizontal,
  MoveRight,
  Pointer,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { planViews, MOBILE_GESTURE_MEDIA } from "@/lib/pilitas/types";
import type { UnitId, ViewId, AmenityId, Language, Currency, ExperienceView, PlanView, TouchIntroStep } from "@/lib/pilitas/types";
import { amenities, generalPlans, virtualTours, renderSourceByUnit, floorPlanFor, renderSourceLabel, facades, hotspots, amenityHotspots, levels } from "@/lib/pilitas/catalog";
import { copy } from "@/lib/pilitas/i18n";
import { residenceName, residenceEyebrow, residenceDescription, formatPrice, statusLabel, statusClass } from "@/lib/pilitas/format";
import { ZoomablePlan } from "@/components/pilitas/zoomable-plan";
import { useInventory } from "@/hooks/use-inventory";
import { answerQuestion } from "@/lib/pilitas/assistant";
import { whatsappUrl } from "@/lib/pilitas/contact";

type ChatItem = { author: "concierge" | "visitor"; text: string };
type SwipeOrigin = { pointerId: number; x: number; y: number } | null;
type RevealDragOrigin = {
  pointerId: number;
  startY: number;
  startOffset: number;
  moved: boolean;
} | null;

export default function Home() {
  const interiorDialogRef = useRef<HTMLDialogElement>(null);
  const generalPlansDialogRef = useRef<HTMLDialogElement>(null);
  const facadeSwipeOriginRef = useRef<SwipeOrigin>(null);
  const experienceSwipeOriginRef = useRef<SwipeOrigin>(null);
  const generalPlanSwipeOriginRef = useRef<SwipeOrigin>(null);
  const revealDragOriginRef = useRef<RevealDragOrigin>(null);
  const suppressSceneClickRef = useRef(false);
  const [language, setLanguage] = useState<Language>("es");
  const [currency, setCurrency] = useState<Currency>("MXN");
  const { residences, mxnPerUsd, syncStatus, updatedAt, contacts } = useInventory();
  const [view, setView] = useState<ViewId>("front");
  const [exploring, setExploring] = useState(false);
  const [touchIntroStep, setTouchIntroStep] = useState<TouchIntroStep>("presentation");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [generalPlansOpen, setGeneralPlansOpen] = useState(false);
  const [generalPlanIndex, setGeneralPlanIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<UnitId | null>(null);
  const [selectedAmenityId, setSelectedAmenityId] = useState<AmenityId | null>(null);
  const [revealOffset, setRevealOffset] = useState(0);
  const [revealDragging, setRevealDragging] = useState(false);
  const [interiorOpen, setInteriorOpen] = useState(false);
  const [experienceView, setExperienceView] = useState<ExperienceView>("interior");
  const [planView, setPlanView] = useState<PlanView>("color");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [renderNoticeVisible, setRenderNoticeVisible] = useState(true);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatItem[]>([
    {
      author: "concierge",
      text: "Bienvenido a Las Verandas de Olas Altas. Puedo ayudarte a elegir una residencia sin sacarte de la experiencia.",
    },
  ]);
  const t = copy[language];

  const selected = useMemo(
    () => residences.find((unit) => unit.id === selectedId) ?? null,
    [residences, selectedId],
  );
  const selectedAmenity = selectedAmenityId ? amenities[selectedAmenityId] : null;
  const selectedTour = selected ? virtualTours[selected.id] ?? null : null;
  const activeGallery = selectedAmenity?.images ?? selected?.images ?? [];
  const activeExperienceName = selectedAmenity?.label[language]
    ?? (selected ? residenceName(selected, language) : "");
  const selectedRenderSource = selected ? renderSourceByUnit[selected.id] : null;

  const selectedPoint = selectedId
    ? hotspots[view].find((point) => point.id === selectedId)
    : null;

  const availableCount = residences.filter((unit) => unit.status === "Disponible").length;

  useEffect(() => {
    const dialog = interiorDialogRef.current;
    if (!dialog) return;

    if (interiorOpen && !dialog.open) {
      dialog.showModal();
    } else if (!interiorOpen && dialog.open) {
      dialog.close();
    }
  }, [interiorOpen]);

  useEffect(() => {
    const dialog = generalPlansDialogRef.current;
    if (!dialog) return;

    if (generalPlansOpen && !dialog.open) {
      dialog.showModal();
    } else if (!generalPlansOpen && dialog.open) {
      dialog.close();
    }
  }, [generalPlansOpen]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!inventoryOpen) return;

    function closeInventoryFromOutside(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest(".inventory-drawer")) return;
      setInventoryOpen(false);
    }

    document.addEventListener("pointerdown", closeInventoryFromOutside);
    return () => document.removeEventListener("pointerdown", closeInventoryFromOutside);
  }, [inventoryOpen]);

  const focusStyle = selectedPoint
    ? (() => {
        const centerX = selectedPoint.x + selectedPoint.width / 2;
        const centerY = selectedPoint.y + selectedPoint.height / 2;
        return {
          "--focus-x": view === "front"
            ? `calc((100vw - 177.7778svh) / 2 + ${(centerX * 1.777778).toFixed(4)}svh)`
            : `${centerX}%`,
          "--focus-y": `${centerY}%`,
          "--focus-relative-x": `${centerX}%`,
          "--focus-relative-y": `${centerY}%`,
        } as CSSProperties;
      })()
    : undefined;

  function selectResidence(id: UnitId) {
    const visibleInCurrentView = hotspots[view].some((zone) => zone.id === id);
    if (!visibleInCurrentView) {
      setView(view === "front" ? "rear" : "front");
    }
    setExploring(true);
    setInventoryOpen(false);
    setSelectedAmenityId(null);
    revealDragOriginRef.current = null;
    setRevealOffset(0);
    setRevealDragging(false);
    setSelectedId(id);
    setGalleryIndex(0);
    setRenderNoticeVisible(true);
  }

  function usesTouchIntro() {
    return window.matchMedia("(max-width: 1199px)").matches;
  }

  function advanceIntro() {
    if (!usesTouchIntro()) {
      setExploring(true);
      return;
    }
    if (touchIntroStep === "presentation") {
      setTouchIntroStep("guides");
      return;
    }
    setTouchIntroStep("presentation");
    setExploring(true);
  }

  function changeView(next: ViewId) {
    setSelectedId(null);
    setSelectedAmenityId(null);
    setView(next);
  }

  function toggleLanguage() {
    setLanguage((current) => current === "es" ? "en" : "es");
  }

  function returnToPresentation() {
    setSelectedId(null);
    setSelectedAmenityId(null);
    setInventoryOpen(false);
    setTouchIntroStep("presentation");
    setExploring(false);
  }

  function openAmenity(id: AmenityId) {
    setSelectedId(null);
    setSelectedAmenityId(id);
    setExploring(true);
    setInventoryOpen(false);
    setGalleryIndex(0);
    setExperienceView("interior");
    setRenderNoticeVisible(false);
    setInteriorOpen(true);
  }

  function closeExperience() {
    setInteriorOpen(false);
    setSelectedAmenityId(null);
  }

  function openGeneralPlans() {
    setInventoryOpen(false);
    setMapOpen(false);
    setGeneralPlanIndex(0);
    setGeneralPlansOpen(true);
  }

  function closeGeneralPlans() {
    setGeneralPlansOpen(false);
  }

  function changeGeneralPlan(direction: -1 | 1) {
    setGeneralPlanIndex((current) => (current + direction + generalPlans.length) % generalPlans.length);
  }

  function openInterior() {
    setSelectedAmenityId(null);
    setGalleryIndex(0);
    setRenderNoticeVisible(true);
    setExperienceView("interior");
    setInteriorOpen(true);
  }

  function openFloorPlan() {
    setSelectedAmenityId(null);
    setPlanView("color");
    setRenderNoticeVisible(true);
    setExperienceView("plan");
    setInteriorOpen(true);
  }

  function openVirtualTour() {
    if (!selectedTour) return;
    setSelectedAmenityId(null);
    setRenderNoticeVisible(true);
    setExperienceView("tour");
    setInteriorOpen(true);
  }

  function changeGallery(direction: -1 | 1) {
    if (!activeGallery.length) return;
    setGalleryIndex((current) => (current + direction + activeGallery.length) % activeGallery.length);
  }

  function changePlanView(direction: -1 | 1) {
    setPlanView((current) => {
      const currentIndex = planViews.indexOf(current);
      return planViews[(currentIndex + direction + planViews.length) % planViews.length];
    });
  }

  function isPhoneViewport() {
    return window.matchMedia(MOBILE_GESTURE_MEDIA).matches;
  }

  function supportsFacadeSwipe(event: ReactPointerEvent<HTMLElement>) {
    return isPhoneViewport()
      || (event.pointerType === "touch" && window.matchMedia("(max-width: 1199px)").matches);
  }

  function horizontalSwipeDirection(origin: SwipeOrigin, endX: number, endY: number): -1 | 1 | null {
    if (!origin) return null;
    const deltaX = endX - origin.x;
    const deltaY = endY - origin.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return null;
    return deltaX < 0 ? 1 : -1;
  }

  function revealMaximumOffset() {
    const panel = document.querySelector<HTMLElement>(".residence-reveal");
    const panelHeight = panel?.getBoundingClientRect().height ?? window.innerHeight * 0.66;
    return Math.max(0, Math.min(window.innerHeight * 0.64, panelHeight - 76));
  }

  function toggleRevealPosition() {
    const maximum = revealMaximumOffset();
    setRevealOffset((current) => current > maximum * 0.16 ? 0 : maximum * 0.72);
  }

  function beginRevealDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!window.matchMedia("(max-width: 1199px)").matches || !event.isPrimary) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    revealDragOriginRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: revealOffset,
      moved: false,
    };
    setRevealDragging(true);
  }

  function moveRevealDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const origin = revealDragOriginRef.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const deltaY = event.clientY - origin.startY;
    if (Math.abs(deltaY) > 5) origin.moved = true;
    setRevealOffset(Math.min(revealMaximumOffset(), Math.max(0, origin.startOffset + deltaY)));
  }

  function finishRevealDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const origin = revealDragOriginRef.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    revealDragOriginRef.current = null;
    setRevealDragging(false);
    if (!origin.moved) toggleRevealPosition();
  }

  function cancelRevealDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (revealDragOriginRef.current?.pointerId !== event.pointerId) return;
    revealDragOriginRef.current = null;
    setRevealDragging(false);
  }

  function beginFacadeSwipe(event: ReactPointerEvent<HTMLElement>) {
    suppressSceneClickRef.current = false;
    if (!supportsFacadeSwipe(event) || !event.isPrimary) {
      facadeSwipeOriginRef.current = null;
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest(".cinematic-header, .cinematic-intro, .intro-guides, .residence-reveal, .inventory-drawer, .concierge-launch, .cinematic-concierge")) {
      facadeSwipeOriginRef.current = null;
      return;
    }
    facadeSwipeOriginRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function finishFacadeSwipe(event: ReactPointerEvent<HTMLElement>) {
    if (!supportsFacadeSwipe(event) || facadeSwipeOriginRef.current?.pointerId !== event.pointerId) return;
    const direction = horizontalSwipeDirection(
      facadeSwipeOriginRef.current,
      event.clientX,
      event.clientY,
    );
    facadeSwipeOriginRef.current = null;
    if (!direction) return;
    suppressSceneClickRef.current = true;
    setExploring(true);
    changeView(view === "front" ? "rear" : "front");
  }

  function beginExperienceSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPhoneViewport() || !event.isPrimary) {
      experienceSwipeOriginRef.current = null;
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, .render-reference-notice")) {
      experienceSwipeOriginRef.current = null;
      return;
    }
    experienceSwipeOriginRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function finishExperienceSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPhoneViewport() || experienceSwipeOriginRef.current?.pointerId !== event.pointerId) return;
    const direction = horizontalSwipeDirection(
      experienceSwipeOriginRef.current,
      event.clientX,
      event.clientY,
    );
    experienceSwipeOriginRef.current = null;
    if (!direction) return;
    if (experienceView === "interior") changeGallery(direction);
    else if (experienceView === "plan") changePlanView(direction);
  }

  function beginGeneralPlanSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPhoneViewport() || !event.isPrimary) {
      generalPlanSwipeOriginRef.current = null;
      return;
    }
    generalPlanSwipeOriginRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function finishGeneralPlanSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPhoneViewport() || generalPlanSwipeOriginRef.current?.pointerId !== event.pointerId) return;
    const direction = horizontalSwipeDirection(
      generalPlanSwipeOriginRef.current,
      event.clientX,
      event.clientY,
    );
    generalPlanSwipeOriginRef.current = null;
    if (direction) changeGeneralPlan(direction);
  }

  function ask(raw: string) {
    const clean = raw.trim().slice(0, 1000);
    if (!clean) return;
    setChat((items) => [
      ...items.slice(-38),
      { author: "visitor", text: clean },
      { author: "concierge", text: answerQuestion(clean, { residences, selectedId, language, currency, mxnPerUsd, isCurrent: syncStatus === "synced" }) },
    ]);
    setMessage("");
    setConciergeOpen(true);
  }

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    ask(message);
  }

  function requestRealView() {
    if (!selected) return;
    setRenderNoticeVisible(false);
    setInteriorOpen(false);
    ask(language === "es"
      ? `Quiero ver una fotografía de dron con la vista real de ${residenceName(selected, language)} y agendar una cita con un asesor de ventas.`
      : `I would like a drone photograph showing the actual view from ${residenceName(selected, language)} and to schedule an appointment with a sales advisor.`);
  }

  return (
    <Dialog open={mapOpen} onOpenChange={setMapOpen}>
    <main
      className={[
        "cinematic-room",
        `view-${view}`,
        exploring ? "is-exploring" : "",
        `intro-step-${touchIntroStep}`,
        selected ? "has-selection" : "",
      ].join(" ")}
      style={focusStyle}
    >
      <section
        className="cinematic-scene"
        aria-label="Las Verandas de Olas Altas"
        onPointerDownCapture={beginFacadeSwipe}
        onPointerUpCapture={finishFacadeSwipe}
        onPointerCancel={() => { facadeSwipeOriginRef.current = null; }}
        onClickCapture={(event) => {
          if (!suppressSceneClickRef.current) return;
          suppressSceneClickRef.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest(".unit-zone, .touch-tap-cue, .residence-reveal, .view-arrow, .inventory-drawer, .concierge-launch, .cinematic-concierge, .cinematic-header")) return;
          if (inventoryOpen) {
            setInventoryOpen(false);
            return;
          }
          if (!exploring) {
            advanceIntro();
            return;
          }
          if (selectedId) setSelectedId(null);
        }}
      >
        <div className="facade-stage">
          <div className="scene-images" aria-hidden="true">
            {Object.entries(facades).map(([key, facade]) => (
              <img
                key={key}
                src={facade.src}
                alt=""
                width={facade.width}
                height={facade.height}
                loading={key === "front" ? "eager" : "lazy"}
                fetchPriority={key === "front" ? "high" : "auto"}
                decoding="async"
                className={[
                  "scene-image",
                  `scene-image-${key}`,
                  key === view ? "is-active" : "",
                ].join(" ")}
              />
            ))}
          </div>
          <div className="scene-color" aria-hidden="true" />
          <div className="scene-atmosphere" aria-hidden="true" />
          <div className="scene-focus" aria-hidden="true" />
          <div className="scene-grain" aria-hidden="true" />

          <div className="hotspot-layer" aria-label={t.hotspots} aria-hidden={!exploring}>
            {hotspots[view].map((point) => {
              const unit = residences.find((item) => item.id === point.id)!;
              return (
                <button
                  type="button"
                  key={`${view}-${point.id}`}
                  className={[
                    "unit-zone",
                    point.id.startsWith("PH") ? "is-penthouse-zone" : "",
                    selectedId === point.id ? "is-selected" : "",
                    statusClass(unit.status),
                  ].join(" ")}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: `${point.width}%`,
                    height: `${point.height}%`,
                    "--zone-shape": point.clip,
                  } as CSSProperties}
                  onClick={() => selectResidence(point.id)}
                  tabIndex={exploring ? 0 : -1}
                  aria-label={`${t.explore} ${residenceName(unit, language)}, ${statusLabel(unit.status, language)}`}
                >
                  <span className="unit-zone-hit" aria-hidden="true" />
                  <span className="unit-zone-surface" aria-hidden="true" />
                  <span className="unit-zone-label">
                    <small>{statusLabel(unit.status, language)}</small>
                    <strong>{point.id.startsWith("PH") ? point.id : `${language === "es" ? "Residencia" : "Residence"} ${point.id}`}</strong>
                  </span>
                </button>
              );
            })}
            {amenityHotspots[view].map((point) => {
              const amenity = amenities[point.id];
              return (
                <button
                  type="button"
                  key={`${view}-${point.id}`}
                  className={`unit-zone amenity-zone amenity-zone--${point.id}`}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: `${point.width}%`,
                    height: `${point.height}%`,
                    "--zone-shape": point.clip,
                  } as CSSProperties}
                  onClick={() => openAmenity(point.id)}
                  tabIndex={exploring ? 0 : -1}
                  aria-label={`${language === "es" ? "Explorar" : "Explore"} ${amenity.label[language]}`}
                >
                  <span className="unit-zone-hit" aria-hidden="true" />
                  <span className="unit-zone-surface" aria-hidden="true" />
                  <span className="unit-zone-label amenity-zone-label">
                    <small>{t.amenity}</small>
                    <strong>{amenity.label[language]}</strong>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <header className="cinematic-header">
          <button
            type="button"
            className="algo-wordmark"
            aria-label={t.brandHome}
            title={t.brandHome}
            onClick={returnToPresentation}
          >
            <span className="algo-monogram" aria-hidden="true">
              <img src="/media/algo-arq-brand-symbol.png" alt="" width="119" height="119" decoding="async" />
            </span>
            <span className="algo-lockup" aria-hidden="true">
              <strong className="algo-brand-line algo-brand-line--top">
                <img className="algo-brand-core" src="/media/algo-arq-brand-algo.png" alt="" width="200" height="51" decoding="async" />
                <span className="algo-brand-reveal algo-brand-reveal--ritmo">
                  <img src="/media/algo-arq-brand-ritmo.png" alt="" width="193" height="41" decoding="async" />
                </span>
              </strong>
              <strong className="algo-brand-line algo-brand-line--bottom">
                <img className="algo-brand-core" src="/media/algo-arq-brand-arq.png" alt="" width="125" height="35" decoding="async" />
                <span className="algo-brand-reveal algo-brand-reveal--uitectonico">
                  <img src="/media/algo-arq-brand-uitectonico.png" alt="" width="292" height="36" decoding="async" />
                </span>
              </strong>
              <small>Digital Sales Room</small>
            </span>
          </button>

          <div className="header-controls">
            <button type="button" className="language-switch" onClick={toggleLanguage} aria-label={t.languageLabel}>
              <Languages />
              <strong>{language.toUpperCase()}</strong>
              <span>{language === "es" ? "EN" : "ES"}</span>
            </button>
            <button
              type="button"
              className="currency-switch"
              onClick={() => setCurrency((current) => current === "MXN" ? "USD" : "MXN")}
              aria-label={t.currencyLabel}
            >
              <strong>{currency}</strong>
              <ArrowLeftRight />
              <span>{currency === "MXN" ? "USD" : "MXN"}</span>
            </button>
            <DialogTrigger asChild>
              <button
                type="button"
                className="map-switch"
                aria-label={t.mapLabel}
                title={t.mapLabel}
                onClick={() => setInventoryOpen(false)}
              >
                <MapPin />
                <strong>{language === "es" ? "MAPA" : "MAP"}</strong>
              </button>
            </DialogTrigger>
            <button
              type="button"
              className="plans-switch"
              aria-label={t.generalPlansAria}
              title={t.generalPlansAria}
              aria-haspopup="dialog"
              onClick={openGeneralPlans}
            >
              <Layers3 />
              <strong>{t.generalPlansShort}</strong>
            </button>
            <div className={`header-availability inventory-sync-${syncStatus}`} role="status" title={syncStatus === "synced" ? (language === "es" ? "Inventario actualizado" : "Inventory updated") : (language === "es" ? "Datos sin verificar: confirma con ventas" : "Unverified data: confirm with sales")}>
              <i />
              <span>{syncStatus === "synced" ? <><strong>{String(availableCount).padStart(2, "0")}</strong> {t.availableOf}</> : (language === "es" ? "Inventario por confirmar" : "Inventory unverified")}</span>
            </div>
          </div>
        </header>

        <section className="cinematic-intro" aria-label={t.introAria}>
          <span className="intro-kicker">{t.kicker}</span>
          <h1 className="sr-only">Las Verandas de Olas Altas</h1>
          <button
            type="button"
            className="project-entry"
            onClick={(event) => {
              event.stopPropagation();
              advanceIntro();
            }}
          >
            <img
              src="/media/las-verandas-logo.png"
              alt="Las Verandas de Olas Altas — Playa Lifestyle Collection"
              className="hero-project-logo"
              width="1440"
              height="860"
              loading="eager"
              decoding="async"
            />
            <span className="project-entry-copy">
              {t.introCopy}
            </span>
            <span className="explore-action">
              <span>{t.explore}</span>
              <MoveRight />
            </span>
          </button>

          <aside className="intro-project-credits" aria-label={t.projectTeam}>
            <span className="project-credits-title">{t.projectBy}</span>
            <div className="intro-credit-logos">
              <div className="intro-project-credit">
                <span>{t.design}</span>
                <img
                  src="/media/partner-arquimedia.png"
                  alt="Arquimedia"
                  className="credit-arquimedia"
                  width="249"
                  height="300"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="intro-project-credit">
                <span>{t.development}</span>
                <img
                  src="/media/partner-playa-lifestyle.png"
                  alt="Playa Lifestyle"
                  className="credit-playa"
                  width="301"
                  height="300"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="intro-project-credit">
                <span>{t.sales}</span>
                <img
                  src="/media/partner-tropicasa.png"
                  alt="Tropicasa Realty"
                  className="credit-tropicasa"
                  width="528"
                  height="265"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </aside>
        </section>

        <aside className="intro-guides" aria-label={t.guidesAria}>
          <div className="intro-guide intro-guide--controls">
            <span>{t.guideControls}</span>
            <svg viewBox="0 0 154 74" aria-hidden="true">
              <path d="M8 64C47 61 84 43 134 13" />
              <path className="guide-highlight" d="M8 64C47 61 84 43 134 13" />
              <path d="M118 12C125 12 132 9 140 5C137 14 136 20 137 27" />
            </svg>
          </div>
          <div className="intro-guide intro-guide--view">
            <span>{t.guideView}</span>
            <svg viewBox="0 0 132 78" aria-hidden="true">
              <path d="M7 13C42 5 77 16 112 57" />
              <path className="guide-highlight" d="M7 13C42 5 77 16 112 57" />
              <path d="M97 52C104 54 108 56 114 63C113 54 113 49 110 43" />
            </svg>
          </div>
          <div className="intro-guide intro-guide--unit">
            <span>{t.guideUnit}</span>
            <svg viewBox="0 0 142 88" aria-hidden="true">
              <path d="M132 9C105 14 87 30 67 52C50 70 33 75 13 74" />
              <path className="guide-highlight" d="M132 9C105 14 87 30 67 52C50 70 33 75 13 74" />
              <path d="M25 65C19 68 16 71 10 75C17 78 22 80 29 81" />
            </svg>
          </div>
          <div className="intro-guide intro-guide--inventory">
            <span>{t.guideInventory}</span>
            <svg viewBox="0 0 72 92" aria-hidden="true">
              <path d="M43 5C51 28 49 48 32 76" />
              <path className="guide-highlight" d="M43 5C51 28 49 48 32 76" />
              <path d="M31 62C31 69 30 74 27 81C35 78 40 77 47 78" />
            </svg>
          </div>
          <div className="intro-swipe-guide">
            <span className="intro-swipe-icon" aria-hidden="true"><MoveHorizontal /></span>
            <span>{t.guideSwipe}</span>
          </div>
        </aside>

        <button
          type="button"
          className="touch-tap-cue"
          aria-label={touchIntroStep === "presentation" ? t.tapContinue : t.tapExplore}
          onClick={(event) => {
            event.stopPropagation();
            advanceIntro();
          }}
        >
          <Pointer aria-hidden="true" />
          <span>TAP</span>
        </button>

        <div className="scene-index">
          <span>{facades[view].number}</span>
          <i />
          <strong>{view === "front" ? t.front : t.rear}</strong>
        </div>

        <button
          type="button"
          className={`view-arrow view-arrow--${view === "front" ? "right" : "left"}`}
          onClick={() => changeView(view === "front" ? "rear" : "front")}
          tabIndex={exploring ? 0 : -1}
          aria-label={view === "front" ? t.viewRear : t.viewFront}
        >
          <span aria-hidden="true">
            {view === "front" ? <ChevronRight /> : <ChevronLeft />}
          </span>
        </button>

        {selected && (
          <aside
            className={`residence-reveal ${revealDragging ? "is-dragging" : ""}`}
            aria-label={residenceName(selected, language)}
            style={{ "--reveal-sheet-offset": `${revealOffset}px` } as CSSProperties}
          >
            <button
              type="button"
              className="reveal-drag-handle"
              aria-label={t.dragResidence}
              title={t.dragResidence}
              onPointerDown={beginRevealDrag}
              onPointerMove={moveRevealDrag}
              onPointerUp={finishRevealDrag}
              onPointerCancel={cancelRevealDrag}
              onClick={(event) => {
                if (event.detail === 0) toggleRevealPosition();
              }}
            >
              <span aria-hidden="true" />
            </button>
            <button type="button" className="reveal-close" onClick={() => setSelectedId(null)} aria-label={t.closeResidence}>
              <X />
            </button>
            <div className="reveal-heading">
              <span className="reveal-eyebrow">{residenceEyebrow(selected, language)}</span>
              <span className={`reveal-status ${statusClass(selected.status)}`}>{statusLabel(selected.status, language)}</span>
            </div>
            <h2>{residenceName(selected, language)}</h2>
            <p className="reveal-location">{t.level} {selected.level} · {selected.code}</p>
            <div className="reveal-metrics">
              <span><strong>{selected.area.toFixed(2)} m²</strong> {t.totalArea}</span>
              <span><strong>{selected.beds}</strong> {selected.beds === 1 ? t.bedroom : t.bedrooms}</span>
              <span><strong>{selected.baths}</strong> {selected.baths === 1 ? t.bathroom : t.bathrooms}</span>
            </div>
            <div className="reveal-price">
              <span>{t.listPrice}</span>
              <strong>{formatPrice(selected.price, currency, mxnPerUsd, language)}</strong>
            </div>
            <div className="reveal-media-actions">
              <button type="button" className="interior-action" onClick={openInterior}>
                <span><Maximize2 /> {t.exploreInterior}</span>
                <ArrowRight />
              </button>
              <button type="button" className="plan-action" onClick={openFloorPlan}>
                <span><Layers3 /> {t.viewPlan}</span>
                <ArrowRight />
              </button>
              {selectedTour && (
                <button type="button" className="tour-action" onClick={openVirtualTour}>
                  <span><MoveHorizontal /> {t.viewTour}</span>
                  <ArrowRight />
                </button>
              )}
            </div>
            <button type="button" className="ask-action" onClick={() => { setConciergeOpen(true); ask(language === "es" ? `Cuéntame sobre ${residenceName(selected, language)}` : `Tell me about ${residenceName(selected, language)}`); }}>
              {t.askResidence}
            </button>
          </aside>
        )}

        <nav
          className={`inventory-drawer ${inventoryOpen ? "is-open" : ""}`}
          aria-label={t.inventoryAria}
          aria-hidden={!exploring}
        >
          <button
            type="button"
            className="inventory-handle"
            onClick={() => setInventoryOpen((current) => !current)}
            aria-expanded={inventoryOpen}
            tabIndex={exploring ? 0 : -1}
          >
            <span><Layers3 /> {t.inventory}</span>
            <span className="inventory-handle-status"><i /> {availableCount} {t.available}</span>
            {inventoryOpen ? <ChevronDown /> : <ChevronUp />}
          </button>

          <div className="inventory-panel" aria-hidden={!inventoryOpen}>
            <div className="inventory-panel-top">
              <div className="inventory-panel-heading">
                <span>{t.availabilityByLevel}</span>
                <strong>{t.selectResidence}</strong>
              </div>
              <div className="inventory-legend" aria-label={t.availabilitySummary}>
                <span className="is-available"><i /> {t.available}</span>
                <span className="is-reserved"><i /> {t.reserved}</span>
                <span className="is-sold"><i /> {t.sold}</span>
              </div>
            </div>

            <div className="inventory-levels">
              {levels.map((level) => {
                const levelUnits = residences.filter((unit) => unit.level === level);
                const isTwoUnitLevel = levelUnits.length === 2;
                return (
                  <section className="inventory-level" key={level} aria-label={`${t.level} ${level}`}>
                    <div className="inventory-level-label">
                      <strong>{language === "es" ? `N${level}` : `L${level}`}</strong>
                      <span>{t.level} {level}</span>
                    </div>
                    <div className="inventory-level-units">
                      {levelUnits.map((unit) => (
                        <button
                          type="button"
                          key={unit.id}
                          className={`${statusClass(unit.status)} ${isTwoUnitLevel ? "is-double-width" : ""} ${selectedId === unit.id ? "is-active" : ""}`}
                          onClick={() => selectResidence(unit.id)}
                          tabIndex={inventoryOpen ? 0 : -1}
                          aria-label={`${residenceName(unit, language)}, ${unit.area.toFixed(2)} m², ${unit.beds} ${unit.beds === 1 ? t.bedroom : t.bedrooms}, ${unit.baths} ${unit.baths === 1 ? t.bathroom : t.bathrooms}, ${formatPrice(unit.price, currency, mxnPerUsd, language)}, ${statusLabel(unit.status, language)}`}
                        >
                          <span className="inventory-unit-id">
                            <small>{unit.code}</small>
                            <strong>{unit.id}</strong>
                          </span>
                          <span className="inventory-unit-commercial">
                            <small>{unit.area.toFixed(2)} m²</small>
                            <strong>{formatPrice(unit.price, currency, mxnPerUsd, language)}</strong>
                          </span>
                          <span className="inventory-unit-rooms" aria-hidden="true">
                            <span><strong>{unit.beds}</strong> {unit.beds === 1 ? t.bedroom : t.bedrooms}</span>
                            <span><strong>{unit.baths}</strong> {unit.baths === 1 ? t.bathroom : t.bathrooms}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <span className="inventory-note">
              {syncStatus === "synced"
                ? `${language === "es" ? "Inventario actualizado" : "Inventory updated"} · ${updatedAt ? new Date(updatedAt).toLocaleTimeString(language === "es" ? "es-MX" : "en-US") : ""}`
                : syncStatus === "loading"
                  ? (language === "es" ? "Consultando inventario · datos de respaldo" : "Checking inventory · backup data")
                  : (language === "es" ? "Sin conexión al inventario · confirma precios y disponibilidad con ventas" : "Inventory unavailable · confirm prices and availability with sales")}
            </span>
          </div>
        </nav>

        <button
          type="button"
          className="concierge-launch"
          onClick={() => setConciergeOpen((current) => !current)}
          aria-expanded={conciergeOpen}
        >
          <span><Sparkles /></span>
          <span>
            <strong>{t.salesAssistant}</strong>
            <small>{t.answerQuestions}</small>
          </span>
        </button>

        {conciergeOpen && (
          <aside className="cinematic-concierge" aria-label={t.salesAssistant}>
            <div className="concierge-top">
              <span><Sparkles /></span>
              <div><strong>{t.salesAssistant}</strong><small>{language === "es" ? "Asistente automático · no envía solicitudes" : "Automated assistant · requests are not sent"}</small></div>
              <button type="button" onClick={() => setConciergeOpen(false)} aria-label={t.closeConcierge}><X /></button>
            </div>
            <div className="concierge-log" aria-live="polite">
              {chat.slice(-3).map((item, index) => (
                <p key={`${item.author}-${index}`} className={item.author}>
                  {item.text}
                </p>
              ))}
            </div>
            <div className="sales-contacts" aria-label={language === "es" ? "Contactar a ventas" : "Contact sales"}>
              <a className="sales-contact" href={whatsappUrl(contacts, language === "es" ? `Hola, me interesa ${selected ? residenceName(selected, language) : "Las Verandas de Olas Altas"}. Quisiera confirmar disponibilidad y agendar una visita.` : `Hello, I am interested in ${selected ? residenceName(selected, language) : "Las Verandas de Olas Altas"}. Please confirm availability and help me arrange a visit.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a className="sales-contact" href={`mailto:${contacts.email}`}>{language === "es" ? "Correo" : "Email"}</a>
              {contacts.bookingUrl && <a className="sales-contact" href={contacts.bookingUrl} target="_blank" rel="noopener noreferrer">{language === "es" ? "Agendar cita" : "Book a visit"}</a>}
            </div>
            <div className="concierge-prompts">
              <button type="button" onClick={() => ask(language === "es" ? "¿Cuál tiene mejor vista?" : "Which residence has the best view?")}>{t.betterView}</button>
              <button type="button" onClick={() => ask(language === "es" ? "Compara 301 y 302" : "Compare 301 and 302")}>{t.compare}</button>
              <button type="button" onClick={() => ask(language === "es" ? "¿Cuál es el esquema de pago?" : "What are the payment options?")}>{t.payment}</button>
            </div>
            <form onSubmit={submitQuestion} className="concierge-input">
              <MessageCircle />
              <input
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t.writeQuestion}
                aria-label={t.questionAria}
              />
              <button type="submit" aria-label={t.sendQuestion}><Send /></button>
            </form>
          </aside>
        )}
      </section>

      <dialog
        ref={interiorDialogRef}
        className={`interior-experience ${experienceView === "plan" ? "is-plan-view" : ""} ${experienceView === "tour" ? "is-tour-view" : ""} ${selectedAmenity ? "is-amenity-view" : ""}`}
        aria-modal="true"
        aria-label={selectedAmenity
          ? `${t.amenityGallery} ${selectedAmenity.label[language]}`
          : selected
            ? `${experienceView === "plan" ? t.planOf : experienceView === "tour" ? t.tourOf : t.interiorsOf} ${residenceName(selected, language)}`
            : undefined}
        onClose={closeExperience}
        onCancel={closeExperience}
      >
        {interiorOpen && (selected || selectedAmenity) && (
          <>
            <div
              className="interior-stage"
              onPointerDown={beginExperienceSwipe}
              onPointerUp={finishExperienceSwipe}
              onPointerCancel={() => { experienceSwipeOriginRef.current = null; }}
            >
              {experienceView === "interior" ? (
                <>
                  {activeGallery.map((image, index) => (
                    <div
                      key={image}
                      className={index === galleryIndex ? "interior-slide is-active" : "interior-slide"}
                    >
                      <img
                        src={image}
                        alt=""
                        className="interior-backdrop"
                        aria-hidden="true"
                        draggable={false}
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                      <ZoomablePlan
                        src={image}
                        alt={index === galleryIndex ? `${activeExperienceName} · ${index + 1}` : ""}
                        interactionLabel={t.zoomImage}
                        imageClassName="interior-image"
                        viewportClassName="interior-zoom-viewport"
                        active={index === galleryIndex}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === galleryIndex ? "high" : "auto"}
                        onNavigate={activeGallery.length > 1 ? changeGallery : undefined}
                      />
                    </div>
                  ))}
                  <div className="interior-tone" />
                  <span className="image-zoom-hint">{t.zoomImageHint}</span>
                </>
              ) : experienceView === "plan" && selected ? (
                <div className="floor-plan-stage">
                  <div className="plan-toolbar">
                    <div className="plan-variant-switcher" role="group" aria-label={t.planVersion}>
                      <button
                        type="button"
                        className={planView === "color" ? "is-active" : ""}
                        onClick={() => setPlanView("color")}
                        aria-pressed={planView === "color"}
                      >
                        {t.color}
                      </button>
                      <button
                        type="button"
                        className={planView === "clean" ? "is-active" : ""}
                        onClick={() => setPlanView("clean")}
                        aria-pressed={planView === "clean"}
                      >
                        {t.clean}
                      </button>
                      <button
                        type="button"
                        className={planView === "dimensions" ? "is-active" : ""}
                        onClick={() => setPlanView("dimensions")}
                        aria-pressed={planView === "dimensions"}
                      >
                        {t.dimensions}
                      </button>
                    </div>
                    <a
                      className="plan-download-button"
                      href={floorPlanFor(selected.id, planView)}
                      download={`Las-Verandas-${selected.id}-${planView}.webp`}
                      aria-label={`${t.downloadPlan}: ${residenceName(selected, language)}`}
                      title={t.downloadPlan}
                    >
                      <Download aria-hidden="true" />
                      <span>{t.downloadPlan}</span>
                    </a>
                  </div>
                  <div className="floor-plan-canvas">
                    <ZoomablePlan
                      key={floorPlanFor(selected.id, planView)}
                      src={floorPlanFor(selected.id, planView)}
                      alt={`${language === "es"
                        ? planView === "color" ? "Plano amueblado a color" : planView === "clean" ? "Plano sin cotas" : "Plano con cotas"
                        : planView === "color" ? "Color furnished floor plan" : planView === "clean" ? "Floor plan without dimensions" : "Floor plan with dimensions"} ${language === "es" ? "de" : "of"} ${residenceName(selected, language)}`}
                      interactionLabel={t.zoomPlan}
                      imageClassName="floor-plan-image"
                      loading="eager"
                      fetchPriority="high"
                      onNavigate={changePlanView}
                    />
                    <span className="plan-zoom-hint">{t.zoomPlanHint}</span>
                  </div>
                </div>
              ) : experienceView === "tour" && selected && selectedTour ? (
                <div className="virtual-tour-stage">
                  <span>{t.tourLoading}</span>
                  <iframe
                    key={`${selected.id}-${selectedTour.src}`}
                    src={selectedTour.src}
                    title={`${t.tourOf} ${residenceName(selected, language)}`}
                    loading="eager"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="fullscreen; accelerometer; gyroscope"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>

            <div className="interior-header">
              <button type="button" onClick={closeExperience} aria-label={t.backBuilding}>
                <ArrowLeft /> <span>{t.backBuilding}</span>
              </button>
              {selectedAmenity ? (
                <div className="amenity-experience-title">
                  <small>{t.amenity}</small>
                  <strong>{selectedAmenity.label[language]}</strong>
                </div>
              ) : (
                <div className={`experience-switcher ${selectedTour ? "has-tour" : ""}`} role="group" aria-label={t.residenceContent}>
                  <button
                    type="button"
                    className={experienceView === "interior" ? "is-active" : ""}
                    onClick={() => setExperienceView("interior")}
                    aria-pressed={experienceView === "interior"}
                  >
                    {t.interiors}
                  </button>
                  <button
                    type="button"
                    className={experienceView === "plan" ? "is-active" : ""}
                    onClick={() => setExperienceView("plan")}
                    aria-pressed={experienceView === "plan"}
                  >
                    {t.plan}
                  </button>
                  {selectedTour && (
                    <button
                      type="button"
                      className={experienceView === "tour" ? "is-active" : ""}
                      onClick={() => {
                        setRenderNoticeVisible(true);
                        setExperienceView("tour");
                      }}
                      aria-pressed={experienceView === "tour"}
                    >
                      {t.tour}
                    </button>
                  )}
                </div>
              )}
              <button type="button" className="interior-x" onClick={closeExperience} aria-label={t.closeInterior}><X /></button>
            </div>

            {experienceView === "interior" && activeGallery.length > 1 && (
              <>
                <button
                  type="button"
                  className="experience-edge-nav experience-edge-nav--left"
                  onClick={() => changeGallery(-1)}
                  aria-label={t.previousImage}
                >
                  <span aria-hidden="true"><ChevronLeft /></span>
                </button>
                <button
                  type="button"
                  className="experience-edge-nav experience-edge-nav--right"
                  onClick={() => changeGallery(1)}
                  aria-label={t.nextImage}
                >
                  <span aria-hidden="true"><ChevronRight /></span>
                </button>
              </>
            )}

            {experienceView === "plan" && selected && (
              <>
                <button
                  type="button"
                  className="experience-edge-nav experience-edge-nav--left experience-edge-nav--plan"
                  onClick={() => changePlanView(-1)}
                  aria-label={t.previousPlan}
                >
                  <span aria-hidden="true"><ChevronLeft /></span>
                </button>
                <button
                  type="button"
                  className="experience-edge-nav experience-edge-nav--right experience-edge-nav--plan"
                  onClick={() => changePlanView(1)}
                  aria-label={t.nextPlan}
                >
                  <span aria-hidden="true"><ChevronRight /></span>
                </button>
              </>
            )}

            {experienceView === "interior" && selected && selectedRenderSource && selectedRenderSource !== selected.id && renderNoticeVisible && (
              <aside className="render-reference-notice" aria-label={t.referenceNotice}>
                <span className="render-reference-icon" aria-hidden="true"><Sparkles /></span>
                <div className="render-reference-copy">
                  <span>{t.referenceImage}</span>
                  <strong>{t.sameGeometry}</strong>
                  <p>
                    {language === "es"
                      ? `La distribución de ${residenceName(selected, language)} es la misma; estas imágenes muestran la vista correspondiente a ${renderSourceLabel(selectedRenderSource, language)}.`
                      : `${residenceName(selected, language)} has the same layout; these images show the view associated with ${renderSourceLabel(selectedRenderSource, language)}.`}
                  </p>
                </div>
                <div className="render-reference-actions">
                  <button type="button" className="render-reference-request" onClick={requestRealView}>
                    <MessageCircle /> {t.requestReal}
                  </button>
                  <button type="button" className="render-reference-dismiss" onClick={() => setRenderNoticeVisible(false)}>
                    {t.understood}
                  </button>
                </div>
              </aside>
            )}

            {experienceView === "tour" && selected && selectedTour && selectedTour.viewSource !== selected.id && renderNoticeVisible && (
              <aside className="render-reference-notice tour-reference-notice" aria-label={t.tourReferenceNotice}>
                <span className="render-reference-icon" aria-hidden="true"><MoveHorizontal /></span>
                <div className="render-reference-copy">
                  <span>{t.tourReference}</span>
                  <strong>{t.sameTourGeometry}</strong>
                  <p>
                    {language === "es"
                      ? `La distribución de ${residenceName(selected, language)} corresponde a este recorrido; la vista mostrada pertenece a ${renderSourceLabel(selectedTour.viewSource, language)}, la residencia más alta de esta fila.`
                      : `${residenceName(selected, language)} shares this tour's layout; the view shown belongs to ${renderSourceLabel(selectedTour.viewSource, language)}, the highest residence in this stack.`}
                  </p>
                </div>
                <div className="render-reference-actions">
                  <button type="button" className="render-reference-dismiss" onClick={() => setRenderNoticeVisible(false)}>
                    {t.understood}
                  </button>
                </div>
              </aside>
            )}

            {experienceView === "interior" && selected && <div className="interior-story">
              <span>{residenceEyebrow(selected, language)}</span>
              <h2>{residenceName(selected, language)}</h2>
              <p>{residenceDescription(selected, language)}</p>
              <div>
                <strong>{selected.area.toFixed(2)} m²</strong>
                <strong>{selected.beds} {language === "es" ? "rec." : "bed"}</strong>
                <strong>{selected.baths} {selected.baths === 1 ? t.bathroom : t.bathrooms}</strong>
              </div>
            </div>}

            {experienceView === "interior" && selectedAmenity && <div className="interior-story amenity-story">
              <span>{selectedAmenity.eyebrow[language]}</span>
              <h2>{selectedAmenity.label[language]}</h2>
              <p>{selectedAmenity.description[language]}</p>
            </div>}

          </>
        )}
      </dialog>

      <dialog
        ref={generalPlansDialogRef}
        className="general-plans-experience is-plan-view"
        aria-modal="true"
        aria-label={`${t.generalPlans}: ${generalPlans[generalPlanIndex].label[language]}`}
        onClose={closeGeneralPlans}
        onCancel={closeGeneralPlans}
      >
        <div
          className="general-plan-stage"
          onPointerDown={beginGeneralPlanSwipe}
          onPointerUp={finishGeneralPlanSwipe}
          onPointerCancel={() => { generalPlanSwipeOriginRef.current = null; }}
        >
          {generalPlans.map((plan, index) => (
            <div
              key={plan.id}
              className={index === generalPlanIndex ? "general-plan-slide is-active" : "general-plan-slide"}
              aria-hidden={index !== generalPlanIndex}
            >
              <ZoomablePlan
                key={`${plan.id}-${index === generalPlanIndex ? "active" : "inactive"}`}
                src={plan.src}
                alt={index === generalPlanIndex ? `${t.generalPlanOf} ${plan.label[language]}` : ""}
                interactionLabel={t.zoomPlan}
                imageClassName="general-plan-image"
                active={index === generalPlanIndex}
                loading="lazy"
                fetchPriority={generalPlansOpen && index === generalPlanIndex ? "high" : "auto"}
                onNavigate={changeGeneralPlan}
              />
            </div>
          ))}
        </div>

        <div className="interior-header general-plans-header">
          <button type="button" onClick={closeGeneralPlans} aria-label={t.backBuilding}>
            <ArrowLeft /> <span>{t.backBuilding}</span>
          </button>
          <label className="general-plan-picker">
            <Layers3 aria-hidden="true" />
            <span className="sr-only">{t.chooseGeneralPlan}</span>
            <select
              value={generalPlanIndex}
              onChange={(event) => setGeneralPlanIndex(Number(event.target.value))}
              aria-label={t.chooseGeneralPlan}
            >
              {generalPlans.map((plan, index) => (
                <option key={plan.id} value={index}>{plan.label[language]}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
          <div className="general-plan-actions">
            <a
              className="plan-download-button"
              href={generalPlans[generalPlanIndex].src}
              download={`Las-Verandas-${generalPlans[generalPlanIndex].id}.webp`}
              aria-label={`${t.downloadPlan}: ${generalPlans[generalPlanIndex].label[language]}`}
              title={t.downloadPlan}
            >
              <Download aria-hidden="true" />
              <span>{t.downloadPlan}</span>
            </a>
            <button type="button" className="interior-x" onClick={closeGeneralPlans} aria-label={t.closeGeneralPlans}><X /></button>
          </div>
        </div>

        <button
          type="button"
          className="experience-edge-nav experience-edge-nav--left"
          onClick={() => changeGeneralPlan(-1)}
          aria-label={t.previousGeneralPlan}
        >
          <span aria-hidden="true"><ChevronLeft /></span>
        </button>
        <button
          type="button"
          className="experience-edge-nav experience-edge-nav--right"
          onClick={() => changeGeneralPlan(1)}
          aria-label={t.nextGeneralPlan}
        >
          <span aria-hidden="true"><ChevronRight /></span>
        </button>

        <div className="general-plan-caption" aria-live="polite">
          <small>{t.generalPlans}</small>
          <strong>{generalPlans[generalPlanIndex].label[language]}</strong>
          <span>{String(generalPlanIndex + 1).padStart(2, "0")} / {String(generalPlans.length).padStart(2, "0")}</span>
        </div>
        <span className="general-plan-swipe-hint">{t.swipeGeneralPlans}</span>
      </dialog>

      <DialogContent className="location-dialog">
        <DialogHeader className="location-dialog-header">
          <span className="location-dialog-kicker"><MapPin /> {t.mapLabel}</span>
          <DialogTitle>{t.mapTitle}</DialogTitle>
          <DialogDescription>{t.mapDescription}</DialogDescription>
        </DialogHeader>
        <div className="location-map-frame">
          <iframe
            title={t.mapTitle}
            src="https://www.google.com/maps?q=Olas+Altas+601,+Zona+Rom%C3%A1ntica,+Amapas,+48399+Puerto+Vallarta,+Jal.&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <address className="location-dialog-address"><MapPin /> {t.mapAddress}</address>
      </DialogContent>
    </main>
    </Dialog>
  );
}
