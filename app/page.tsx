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
type UnitId =
  | "201" | "202" | "203" | "204"
  | "301" | "302" | "303" | "304"
  | "401" | "402" | "403" | "404"
  | "501" | "502" | "PH1" | "PH2";
type ViewId = "front" | "rear";
type AmenityId = "lobby" | "rooftop";
type UnitStatus = "Disponible" | "Apartada" | "Vendida";
type ExperienceView = "interior" | "plan" | "tour";
type PlanView = "color" | "clean" | "dimensions";
type RenderSourceId = "401" | "402" | "403" | "404" | "PH1" | "PH2";
type Language = "es" | "en";
type Currency = "MXN" | "USD";
type TouchIntroStep = "presentation" | "guides";

const planViews: PlanView[] = ["color", "clean", "dimensions"];
const MOBILE_GESTURE_MEDIA = "(max-width: 767px), (max-width: 1199px) and (orientation: landscape) and (max-height: 600px)";

type Residence = {
  id: UnitId;
  code: string;
  name: string;
  eyebrow: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  level: number;
  status: UnitStatus;
  description: string;
  images: string[];
};

type Amenity = {
  id: AmenityId;
  label: Record<Language, string>;
  eyebrow: Record<Language, string>;
  description: Record<Language, string>;
  images: string[];
};

type GeneralPlan = {
  id: string;
  label: Record<Language, string>;
  src: string;
};

type VirtualTour = {
  src: string;
  viewSource: RenderSourceId;
};

// Familia 01: el orden A/B es intencional y esta galería se comparte
// exclusivamente entre 201, 301 y 401.
const family01Gallery = [
  "/media/interiors/family-01-a.webp",
  "/media/interiors/family-01-b.webp",
];
const gallery402 = ["/media/interiors/3-402.webp", "/media/interiors/4-402.webp"];
const gallery403 = ["/media/interiors/5-403.webp", "/media/interiors/6-403.webp"];
const gallery404 = ["/media/interiors/7-404.webp", "/media/interiors/8-404.webp"];
const galleryPH1 = ["/media/interiors/9-PH1.webp", "/media/interiors/10-PH1.webp", "/media/interiors/11-PH1.webp"];
const galleryPH2 = ["/media/interiors/12-PH2.webp", "/media/interiors/13-PH2.webp", "/media/interiors/14-PH2.webp"];

const amenities: Record<AmenityId, Amenity> = {
  lobby: {
    id: "lobby",
    label: { es: "Lobby", en: "Lobby" },
    eyebrow: { es: "Acceso principal", en: "Main entrance" },
    description: {
      es: "Un acceso cálido y privado que recibe a residentes y visitantes en Las Verandas de Olas Altas.",
      en: "A warm, private arrival space welcoming residents and guests at Las Verandas de Olas Altas.",
    },
    images: ["/media/amenities/lobby.webp"],
  },
  rooftop: {
    id: "rooftop",
    label: { es: "Rooftop", en: "Rooftop" },
    eyebrow: { es: "Terraza con alberca", en: "Pool terrace" },
    description: {
      es: "Una terraza elevada con alberca, áreas de descanso y vistas abiertas hacia Puerto Vallarta y el Pacífico.",
      en: "An elevated terrace with a pool, lounge areas, and open views toward Puerto Vallarta and the Pacific.",
    },
    images: [
      "/media/amenities/rooftop-01.webp",
      "/media/amenities/rooftop-02.webp",
      "/media/amenities/rooftop-03.webp",
    ],
  },
};

const generalPlans: GeneralPlan[] = [
  { id: "basement", label: { es: "Sótano", en: "Basement" }, src: "/media/general-plans/00-basement.webp" },
  { id: "ground-floor", label: { es: "Planta baja", en: "Ground floor" }, src: "/media/general-plans/01-ground-floor.webp" },
  { id: "level-2", label: { es: "Nivel 2", en: "Level 2" }, src: "/media/general-plans/02-level-2.webp" },
  { id: "level-3", label: { es: "Nivel 3", en: "Level 3" }, src: "/media/general-plans/03-level-3.webp" },
  { id: "level-4", label: { es: "Nivel 4", en: "Level 4" }, src: "/media/general-plans/04-level-4.webp" },
  { id: "level-5", label: { es: "Nivel 5", en: "Level 5" }, src: "/media/general-plans/05-level-5.webp" },
  { id: "level-6", label: { es: "Nivel 6", en: "Level 6" }, src: "/media/general-plans/06-level-6.webp" },
  { id: "rooftop", label: { es: "Roof", en: "Rooftop" }, src: "/media/general-plans/07-rooftop.webp" },
];

const renderSourceByUnit: Record<UnitId, RenderSourceId> = {
  "201": "401",
  "202": "402",
  "203": "403",
  "204": "404",
  "301": "401",
  "302": "402",
  "303": "403",
  "304": "404",
  "401": "401",
  "402": "402",
  "403": "403",
  "404": "404",
  "501": "PH1",
  "502": "PH2",
  PH1: "PH1",
  PH2: "PH2",
};

const virtualTours: Partial<Record<UnitId, VirtualTour>> = {
  PH1: {
    src: "https://madininv-collab.github.io/recorridos-360/PENTHHOUSE/",
    viewSource: "PH1",
  },
  "501": {
    src: "https://madininv-collab.github.io/recorridos-360/PENTHHOUSE/",
    viewSource: "PH1",
  },
  "201": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20301/",
    viewSource: "401",
  },
  "301": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20301/",
    viewSource: "401",
  },
  "401": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20301/",
    viewSource: "401",
  },
  "202": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20302/",
    viewSource: "402",
  },
  "302": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20302/",
    viewSource: "402",
  },
  "402": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20302/",
    viewSource: "402",
  },
  "204": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20304/",
    viewSource: "404",
  },
  "304": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20304/",
    viewSource: "404",
  },
  "404": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20304/",
    viewSource: "404",
  },
};

function renderSourceLabel(id: RenderSourceId, language: Language) {
  return id.startsWith("PH") ? `Penthouse ${id}` : `${language === "es" ? "Residencia" : "Residence"} ${id}`;
}

function floorPlanFor(id: UnitId, view: PlanView) {
  const suffix = view === "color" ? "" : `-${view}`;
  return `/media/plans/plan-${id.toLowerCase()}${suffix}.webp`;
}

type PlanTransform = { scale: number; x: number; y: number };
type PlanPointer = { x: number; y: number };
type PlanTap = { time: number; x: number; y: number };
type PlanDragStart = {
  pointerX: number;
  pointerY: number;
  scale: number;
  translateX: number;
  translateY: number;
};
type PlanPinchStart = {
  distance: number;
  centerX: number;
  centerY: number;
  scale: number;
  translateX: number;
  translateY: number;
};

type ZoomablePlanProps = {
  src: string;
  alt: string;
  interactionLabel: string;
  imageClassName: string;
  viewportClassName?: string;
  active?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  onNavigate?: (direction: -1 | 1) => void;
};

const MAX_PLAN_ZOOM = 4;
const ZOOM_RETURN_DURATION_MS = 280;

function usesTransientMobileZoom() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_GESTURE_MEDIA).matches;
}

function ZoomablePlan({
  src,
  alt,
  interactionLabel,
  imageClassName,
  viewportClassName = "",
  active = true,
  loading = "eager",
  fetchPriority = "auto",
  onNavigate,
}: ZoomablePlanProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, PlanPointer>());
  const dragStartRef = useRef<PlanDragStart | null>(null);
  const pinchStartRef = useRef<PlanPinchStart | null>(null);
  const pinchUsedRef = useRef(false);
  const lastTapRef = useRef<PlanTap | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const transformRef = useRef<PlanTransform>({ scale: 1, x: 0, y: 0 });
  const [transform, setTransform] = useState<PlanTransform>({ scale: 1, x: 0, y: 0 });
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
  }, []);

  function applyTransform(scale: number, x: number, y: number) {
    const nextScale = Math.min(MAX_PLAN_ZOOM, Math.max(1, scale));
    const viewport = viewportRef.current;
    const maxX = viewport ? viewport.clientWidth * (nextScale - 1) / 2 : 0;
    const maxY = viewport ? viewport.clientHeight * (nextScale - 1) / 2 : 0;
    const next = {
      scale: nextScale,
      x: Math.min(maxX, Math.max(-maxX, nextScale === 1 ? 0 : x)),
      y: Math.min(maxY, Math.max(-maxY, nextScale === 1 ? 0 : y)),
    };
    transformRef.current = next;
    setTransform(next);
  }

  function resetTransform(animate = false) {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    setIsResetting(animate);
    pointersRef.current.clear();
    dragStartRef.current = null;
    pinchStartRef.current = null;
    pinchUsedRef.current = false;
    lastTapRef.current = null;
    applyTransform(1, 0, 0);
    if (animate) {
      resetTimerRef.current = window.setTimeout(() => {
        setIsResetting(false);
        resetTimerRef.current = null;
      }, ZOOM_RETURN_DURATION_MS);
    }
  }

  function beginPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!active) return;
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    setIsResetting(false);
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      pinchUsedRef.current = false;
      dragStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        scale: transformRef.current.scale,
        translateX: transformRef.current.x,
        translateY: transformRef.current.y,
      };
      return;
    }

    const [first, second] = Array.from(pointersRef.current.values());
    pinchUsedRef.current = true;
    lastTapRef.current = null;
    dragStartRef.current = null;
    pinchStartRef.current = {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      centerX: (first.x + second.x) / 2,
      centerY: (first.y + second.y) / 2,
      scale: transformRef.current.scale,
      translateX: transformRef.current.x,
      translateY: transformRef.current.y,
    };
  }

  function movePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!active || !pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2 && pinchStartRef.current) {
      const viewport = viewportRef.current;
      const [first, second] = Array.from(pointersRef.current.values());
      if (!viewport) return;
      const pinch = pinchStartRef.current;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const rect = viewport.getBoundingClientRect();
      const startOffsetX = pinch.centerX - rect.left - rect.width / 2;
      const startOffsetY = pinch.centerY - rect.top - rect.height / 2;
      const currentOffsetX = centerX - rect.left - rect.width / 2;
      const currentOffsetY = centerY - rect.top - rect.height / 2;
      const nextScale = Math.min(MAX_PLAN_ZOOM, Math.max(1, pinch.scale * distance / Math.max(1, pinch.distance)));
      const ratio = nextScale / pinch.scale;
      applyTransform(
        nextScale,
        currentOffsetX - ratio * (startOffsetX - pinch.translateX),
        currentOffsetY - ratio * (startOffsetY - pinch.translateY),
      );
      return;
    }

    const drag = dragStartRef.current;
    if (drag && transformRef.current.scale > 1) {
      applyTransform(
        drag.scale,
        drag.translateX + event.clientX - drag.pointerX,
        drag.translateY + event.clientY - drag.pointerY,
      );
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    const drag = dragStartRef.current;
    const usedPinch = pinchUsedRef.current;
    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size === 1 && pinchUsedRef.current) {
      const remaining = Array.from(pointersRef.current.values())[0];
      dragStartRef.current = {
        pointerX: remaining.x,
        pointerY: remaining.y,
        scale: transformRef.current.scale,
        translateX: transformRef.current.x,
        translateY: transformRef.current.y,
      };
      pinchStartRef.current = null;
      return;
    }

    if (pointersRef.current.size > 0) return;

    const deltaX = drag ? event.clientX - drag.pointerX : 0;
    const deltaY = drag ? event.clientY - drag.pointerY : 0;
    const isTap = Boolean(
      !cancelled
      && !pinchUsedRef.current
      && drag
      && Math.hypot(deltaX, deltaY) <= 12,
    );

    if (isTap && event.pointerType === "touch") {
      const currentTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
      const previousTap = lastTapRef.current;
      if (
        previousTap
        && currentTap.time - previousTap.time <= 325
        && Math.hypot(currentTap.x - previousTap.x, currentTap.y - previousTap.y) <= 36
      ) {
        resetTransform(usesTransientMobileZoom());
        return;
      }
      lastTapRef.current = currentTap;
    } else if (!isTap) {
      lastTapRef.current = null;
    }

    if (usesTransientMobileZoom() && (usedPinch || transformRef.current.scale > 1.02)) {
      resetTransform(true);
      return;
    }

    if (
      !cancelled
      && !usedPinch
      && drag
      && transformRef.current.scale === 1
      && onNavigate
      && window.matchMedia(MOBILE_GESTURE_MEDIA).matches
    ) {
      if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) >= Math.abs(deltaY) * 1.2) {
        onNavigate(deltaX < 0 ? 1 : -1);
      }
    }

    if (transformRef.current.scale < 1.02) applyTransform(1, 0, 0);
    dragStartRef.current = null;
    pinchStartRef.current = null;
    pinchUsedRef.current = false;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      applyTransform(transformRef.current.scale + 0.5, transformRef.current.x, transformRef.current.y);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      applyTransform(transformRef.current.scale - 0.5, transformRef.current.x, transformRef.current.y);
    } else if (event.key === "0") {
      event.preventDefault();
      resetTransform();
    } else if (transformRef.current.scale === 1 && event.key === "ArrowLeft" && onNavigate) {
      event.preventDefault();
      onNavigate(-1);
    } else if (transformRef.current.scale === 1 && event.key === "ArrowRight" && onNavigate) {
      event.preventDefault();
      onNavigate(1);
    }
  }

  return (
    <div
      ref={viewportRef}
      className={`plan-zoom-viewport ${viewportClassName} ${transform.scale > 1 ? "is-zoomed" : ""} ${isResetting ? "is-resetting" : ""}`.trim()}
      tabIndex={active ? 0 : -1}
      aria-label={interactionLabel}
      onPointerDown={beginPointer}
      onPointerMove={movePointer}
      onPointerUp={(event) => endPointer(event)}
      onPointerCancel={(event) => endPointer(event, true)}
      onDoubleClick={(event) => {
        if (transformRef.current.scale <= 1.02 && !usesTransientMobileZoom()) return;
        event.preventDefault();
        event.stopPropagation();
        resetTransform(usesTransientMobileZoom());
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="plan-zoom-transform"
        style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
      >
        <img
          src={src}
          alt={alt}
          className={imageClassName}
          draggable={false}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
        />
      </div>
    </div>
  );
}

const initialResidences: Residence[] = [
  { id: "201", code: "U 01", name: "Residencia 201", eyebrow: "Una recámara", price: 423500, area: 76.90, beds: 1, baths: 1, level: 2, status: "Disponible", description: "Residencia de una recámara con una distribución eficiente y 76.90 m² de área total.", images: family01Gallery },
  { id: "202", code: "U 02", name: "Residencia 202", eyebrow: "Una recámara", price: 507300, area: 89.28, beds: 1, baths: 1, level: 2, status: "Vendida", description: "Residencia de una recámara con 89.28 m² de área total en el segundo nivel.", images: gallery402 },
  { id: "203", code: "U 03", name: "Residencia 203", eyebrow: "Una recámara", price: 507300, area: 88.83, beds: 1, baths: 1, level: 2, status: "Apartada", description: "Residencia de una recámara con 88.83 m² de área total en el segundo nivel.", images: gallery403 },
  { id: "204", code: "U 04", name: "Residencia 204", eyebrow: "Una recámara", price: 396000, area: 90.70, beds: 1, baths: 1, level: 2, status: "Disponible", description: "Residencia de una recámara con 90.70 m² de área total en el segundo nivel.", images: gallery404 },
  { id: "301", code: "U 05", name: "Residencia 301", eyebrow: "Una recámara", price: 438900, area: 76.90, beds: 1, baths: 1, level: 3, status: "Vendida", description: "Residencia de una recámara con una distribución eficiente y 76.90 m² de área total.", images: family01Gallery },
  { id: "302", code: "U 06", name: "Residencia 302", eyebrow: "Una recámara", price: 525100, area: 89.28, beds: 1, baths: 1, level: 3, status: "Disponible", description: "Residencia de una recámara con 89.28 m² de área total en el tercer nivel.", images: gallery402 },
  { id: "303", code: "U 07", name: "Residencia 303", eyebrow: "Una recámara", price: 525100, area: 88.83, beds: 1, baths: 1, level: 3, status: "Apartada", description: "Residencia de una recámara con 88.83 m² de área total en el tercer nivel.", images: gallery403 },
  { id: "304", code: "U 08", name: "Residencia 304", eyebrow: "Una recámara", price: 410400, area: 71.86, beds: 1, baths: 1, level: 3, status: "Vendida", description: "Residencia de una recámara con 71.86 m² de área total en el tercer nivel.", images: gallery404 },
  { id: "401", code: "U 09", name: "Residencia 401", eyebrow: "Una recámara", price: 485100, area: 76.90, beds: 1, baths: 1, level: 4, status: "Disponible", description: "Residencia de una recámara con 76.90 m² de área total en el cuarto nivel.", images: family01Gallery },
  { id: "402", code: "U 10", name: "Residencia 402", eyebrow: "Una recámara", price: 579390, area: 89.28, beds: 1, baths: 1, level: 4, status: "Vendida", description: "Residencia de una recámara con 89.28 m² de área total en el cuarto nivel.", images: gallery402 },
  { id: "403", code: "U 11", name: "Residencia 403", eyebrow: "Una recámara", price: 579390, area: 88.83, beds: 1, baths: 1, level: 4, status: "Disponible", description: "Residencia de una recámara con 88.83 m² de área total en el cuarto nivel.", images: gallery403 },
  { id: "404", code: "U 12", name: "Residencia 404", eyebrow: "Una recámara", price: 453600, area: 71.86, beds: 1, baths: 1, level: 4, status: "Apartada", description: "Residencia de una recámara con 71.86 m² de área total en el cuarto nivel.", images: gallery404 },
  { id: "501", code: "U 13", name: "Residencia 501", eyebrow: "Dos recámaras", price: 853050, area: 142.63, beds: 2, baths: 2, level: 5, status: "Disponible", description: "Residencia amplia de dos recámaras y dos baños con 142.63 m² de área total.", images: galleryPH1 },
  { id: "502", code: "U 14", name: "Residencia 502", eyebrow: "Dos recámaras", price: 853050, area: 142.63, beds: 2, baths: 2, level: 5, status: "Vendida", description: "Residencia amplia de dos recámaras y dos baños con 142.63 m² de área total.", images: galleryPH2 },
  { id: "PH1", code: "U 15", name: "Penthouse PH1", eyebrow: "Dos recámaras", price: 916500, area: 142.63, beds: 2, baths: 2, level: 6, status: "Disponible", description: "Penthouse de dos recámaras y dos baños en el nivel superior, debajo del roof con alberca.", images: galleryPH1 },
  { id: "PH2", code: "U 16", name: "Penthouse PH2", eyebrow: "Dos recámaras", price: 916500, area: 142.63, beds: 2, baths: 2, level: 6, status: "Vendida", description: "Penthouse de dos recámaras y dos baños en el nivel superior, debajo del roof con alberca.", images: galleryPH2 },
];

const facades: Record<ViewId, { src: string; label: string; number: string; width: number; height: number }> = {
  front: {
    src: "/media/pilitas-front-ultrawide.png",
    label: "Fachada principal",
    number: "01",
    width: 2880,
    height: 1152,
  },
  rear: {
    src: "/media/pilitas-rear-master.jpg",
    label: "Fachada posterior",
    number: "02",
    width: 2048,
    height: 1152,
  },
};

type FacadeZone<Id extends string> = {
  id: Id;
  x: number;
  y: number;
  width: number;
  height: number;
  clip: string;
};

type UnitZone = FacadeZone<UnitId>;
type AmenityZone = FacadeZone<AmenityId>;

type PixelPoint = readonly [x: number, y: number];

const facadeReference = { width: 2048, height: 1152 } as const;

function facadePolygon<Id extends string>(id: Id, points: readonly PixelPoint[]): FacadeZone<Id> {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  const clip = `polygon(${points
    .map(([x, y]) => {
      const relativeX = ((x - minX) / width) * 100;
      const relativeY = ((y - minY) / height) * 100;
      return `${relativeX.toFixed(2)}% ${relativeY.toFixed(2)}%`;
    })
    .join(", ")})`;

  return {
    id,
    x: (minX / facadeReference.width) * 100,
    y: (minY / facadeReference.height) * 100,
    width: (width / facadeReference.width) * 100,
    height: (height / facadeReference.height) * 100,
    clip,
  };
}

const hotspots: Record<ViewId, UnitZone[]> = {
  front: [
    // Traced from ARREGLAR BOTONEs.jpg against the untouched 2048 × 1152 facade.
    // PH1 wraps both visible planes; PH2 is only the narrow right-hand volume.
    facadePolygon("PH1", [[755, 289], [840, 268], [840, 278], [1114, 205], [1279, 280], [1278, 418], [1114, 379], [755, 436]]),
    facadePolygon("PH2", [[1279, 280], [1395, 329], [1395, 447], [1278, 418]]),
    facadePolygon("501", [[755, 436], [1114, 379], [1278, 418], [1275, 531], [1114, 509], [735, 525]]),
    facadePolygon("502", [[1279, 418], [1395, 447], [1395, 549], [1279, 532]]),
    facadePolygon("401", [[735, 544], [928, 527], [928, 648], [735, 648]]),
    facadePolygon("402", [[928, 527], [1114, 509], [1275, 531], [1275, 647], [1114, 648], [928, 648]]),
    facadePolygon("403", [[1279, 532], [1395, 549], [1395, 645], [1279, 647]]),
    facadePolygon("301", [[735, 648], [928, 648], [928, 768], [735, 755]]),
    facadePolygon("302", [[928, 648], [1114, 648], [1275, 647], [1275, 767], [1114, 786], [928, 768]]),
    facadePolygon("303", [[1279, 647], [1395, 645], [1395, 752], [1279, 767]]),
    facadePolygon("201", [[735, 755], [928, 768], [928, 876], [735, 848]]),
    facadePolygon("202", [[928, 768], [1114, 786], [1275, 767], [1275, 865], [1114, 907], [928, 876]]),
    facadePolygon("203", [[1279, 767], [1395, 752], [1395, 833], [1279, 865]]),
  ],
  rear: [
    // Traced from BOTONES CORREGIDOS.jpg against the 2048 × 1152 rear facade.
    // The colors in the guide are ignored; only their architectural boundaries are used.
    facadePolygon("PH1", [[743, 462], [816, 345], [816, 454], [743, 550]]),
    facadePolygon("PH2", [[816, 345], [926, 160], [1353, 371], [1353, 479], [931, 312], [816, 454]]),
    facadePolygon("501", [[743, 550], [816, 454], [816, 558], [743, 632]]),
    facadePolygon("502", [[816, 454], [931, 312], [1353, 479], [1353, 570], [927, 433], [816, 558]]),
    facadePolygon("402", [[743, 632], [816, 558], [816, 659], [743, 718]]),
    facadePolygon("403", [[816, 558], [927, 433], [1163, 510], [1163, 623], [926, 568], [816, 659]]),
    facadePolygon("404", [[1163, 510], [1353, 570], [1353, 670], [1163, 623]]),
    facadePolygon("302", [[743, 718], [816, 659], [816, 754], [743, 796]]),
    facadePolygon("303", [[816, 659], [926, 568], [1163, 623], [1163, 730], [925, 693], [816, 754]]),
    facadePolygon("304", [[1163, 623], [1353, 670], [1353, 763], [1163, 730]]),
    facadePolygon("202", [[743, 796], [816, 754], [816, 832], [743, 859]]),
    facadePolygon("203", [[816, 754], [925, 693], [1163, 730], [1163, 811], [925, 790], [816, 832]]),
    facadePolygon("204", [[1163, 730], [1353, 763], [1353, 810], [1163, 811]]),
  ],
};

const amenityHotspots: Record<ViewId, AmenityZone[]> = {
  front: [
    // Traced from BOTON NUEVO ROOF FACHADA FRONTAL.png. The lower edge stops
    // precisely at the roofline so the target never competes with PH1 or PH2.
    facadePolygon("rooftop", [[756, 0], [1395, 0], [1395, 324], [1114, 201], [840, 273], [840, 263], [756, 286]]),
    facadePolygon("lobby", [[734, 852], [932, 887], [932, 1019], [734, 961]]),
  ],
  rear: [
    // Traced independently from NUEVO BOTON ROOF FACHADA POSTERIOR.png.
    facadePolygon("rooftop", [[740, 0], [1352, 0], [1352, 366], [925, 156], [740, 459]]),
  ],
};

const levels = [6, 5, 4, 3, 2];

const copy = {
  es: {
    availableOf: "de 16 disponibles",
    introAria: "Presentación del proyecto",
    kicker: "Residencias frente al Pacífico",
    introCopy: "Una mirada íntima a Puerto Vallarta, entre la montaña, la ciudad y el mar.",
    explore: "Explorar residencias",
    tapContinue: "Toca para ver cómo explorar",
    tapExplore: "Toca para explorar las residencias",
    projectTeam: "Equipo del proyecto",
    projectBy: "Un proyecto de",
    design: "Diseño",
    development: "Desarrollo",
    sales: "Comercialización",
    guidesAria: "Cómo explorar el proyecto",
    guideView: "Cambia de fachada aquí",
    guideUnit: "Elige tu unidad en el edificio",
    guideInventory: "Inventario completo abajo",
    guideControls: "Idioma, moneda, mapa y planos aquí",
    guideSwipe: "Desliza para cambiar de fachada o imagen",
    front: "Fachada principal",
    rear: "Fachada posterior",
    viewRear: "Ver fachada posterior",
    viewFront: "Volver a fachada principal",
    hotspots: "Residencias y amenidades visibles en fachada",
    amenity: "Amenidad",
    amenityGallery: "Galería de",
    previousImage: "Ver imagen anterior",
    nextImage: "Ver imagen siguiente",
    closeResidence: "Cerrar residencia",
    dragResidence: "Arrastra para bajar o subir la ficha de la residencia",
    level: "Nivel",
    totalArea: "área total",
    bedroom: "recámara",
    bedrooms: "recámaras",
    bathroom: "baño",
    bathrooms: "baños",
    listPrice: "Precio de lista",
    exploreInterior: "Explorar interior",
    viewPlan: "Ver plano",
    viewTour: "Recorrido 360°",
    askResidence: "Preguntar por esta residencia",
    inventoryAria: "Inventario de residencias",
    inventory: "Inventario",
    residencesCount: "16 residencias",
    presentation: "Presentación",
    availabilityByLevel: "Disponibilidad por nivel",
    selectResidence: "Selecciona una residencia para ubicarla en la fachada",
    availabilitySummary: "Resumen de disponibilidad",
    available: "disponibles",
    reserved: "apartadas",
    sold: "vendidas",
    buildingFacts: "Datos generales del edificio",
    residences: "residencias",
    residentialLevels: "niveles residenciales",
    poolRoof: "con alberca",
    restaurant: "restaurante",
    parking: "cajones",
    inventoryNote: "Áreas según planos · precios y disponibilidad sincronizados con el inventario maestro",
    salesAssistant: "Asistente de ventas",
    answerQuestions: "Resuelve tus dudas",
    availableNow: "Disponible ahora",
    closeConcierge: "Cerrar concierge",
    betterView: "Mejor vista",
    compare: "Comparar 301 / 302",
    payment: "Forma de pago",
    writeQuestion: "Escribe tu pregunta…",
    questionAria: "Pregunta para el asistente de ventas",
    sendQuestion: "Enviar pregunta",
    interiorsOf: "Interiores de",
    planOf: "Plano de",
    tourOf: "Recorrido 360° de",
    planVersion: "Versión del plano",
    color: "Color",
    clean: "Sin cotas",
    dimensions: "Con cotas",
    backBuilding: "Volver al edificio",
    residenceContent: "Contenido de la residencia",
    interiors: "Interiores",
    plan: "Plano",
    tour: "Recorrido 360°",
    closeInterior: "Cerrar interior",
    previousInterior: "Ver imagen interior anterior",
    nextInterior: "Ver imagen interior siguiente",
    previousPlan: "Ver versión anterior del plano",
    nextPlan: "Ver versión siguiente del plano",
    referenceNotice: "Aviso sobre las imágenes de referencia",
    referenceImage: "Imagen de referencia",
    sameGeometry: "Misma geometría, vista de otro nivel",
    tourReferenceNotice: "Aviso sobre el recorrido de referencia",
    tourReference: "Recorrido de referencia",
    sameTourGeometry: "Misma distribución, vista del nivel superior",
    tourLoading: "Cargando recorrido 360°…",
    requestReal: "Solicitar vista real",
    understood: "Entendido",
    languageLabel: "Cambiar a inglés",
    currencyLabel: "Cambiar moneda",
    mapLabel: "Ver ubicación en el mapa",
    mapTitle: "Ubicación de Las Verandas",
    mapDescription: "Olas Altas 601 · Zona Romántica · Puerto Vallarta",
    mapAddress: "Olas Altas 601, Zona Romántica, Amapas, 48399 Puerto Vallarta, Jal.",
    generalPlans: "Planos generales",
    generalPlansShort: "Planos",
    generalPlansAria: "Abrir planos generales del edificio",
    chooseGeneralPlan: "Seleccionar nivel",
    previousGeneralPlan: "Ver plano general anterior",
    nextGeneralPlan: "Ver plano general siguiente",
    closeGeneralPlans: "Cerrar planos generales",
    generalPlanOf: "Plano general de",
    swipeGeneralPlans: "Pellizca para ampliar · suelta para volver · desliza para cambiar de nivel",
    zoomPlan: "Plano ampliable. Pellizca con dos dedos para acercar o alejar; al soltar vuelve suavemente al encuadre y un doble toque lo restablece por completo.",
    zoomPlanHint: "Pellizca para ampliar · suelta o toca dos veces para volver",
    zoomImage: "Imagen ampliable. Pellizca con dos dedos para verla de cerca; al soltar vuelve suavemente al encuadre y un doble toque la restablece por completo.",
    zoomImageHint: "Pellizca para ampliar · suelta o toca dos veces para volver",
    downloadPlan: "Descargar plano",
    brandHome: "Volver a la presentación e instrucciones",
  },
  en: {
    availableOf: "of 16 available",
    introAria: "Project presentation",
    kicker: "Residences overlooking the Pacific",
    introCopy: "An intimate look at Puerto Vallarta, between the mountains, the city, and the sea.",
    explore: "Explore residences",
    tapContinue: "Tap to see how to explore",
    tapExplore: "Tap to explore the residences",
    projectTeam: "Project team",
    projectBy: "A project by",
    design: "Design",
    development: "Development",
    sales: "Sales",
    guidesAria: "How to explore the project",
    guideView: "Switch façades here",
    guideUnit: "Choose a residence on the building",
    guideInventory: "Full inventory below",
    guideControls: "Language, currency, map and plans here",
    guideSwipe: "Swipe to change façade or image",
    front: "Main façade",
    rear: "Rear façade",
    viewRear: "View rear façade",
    viewFront: "Return to main façade",
    hotspots: "Residences and amenities visible on the façade",
    amenity: "Amenity",
    amenityGallery: "Gallery of",
    previousImage: "View previous image",
    nextImage: "View next image",
    closeResidence: "Close residence",
    dragResidence: "Drag to lower or raise the residence details",
    level: "Level",
    totalArea: "total area",
    bedroom: "bedroom",
    bedrooms: "bedrooms",
    bathroom: "bathroom",
    bathrooms: "bathrooms",
    listPrice: "List price",
    exploreInterior: "Explore interior",
    viewPlan: "View floor plan",
    viewTour: "360° tour",
    askResidence: "Ask about this residence",
    inventoryAria: "Residence inventory",
    inventory: "Inventory",
    residencesCount: "16 residences",
    presentation: "Presentation",
    availabilityByLevel: "Availability by level",
    selectResidence: "Select a residence to locate it on the façade",
    availabilitySummary: "Availability summary",
    available: "available",
    reserved: "reserved",
    sold: "sold",
    buildingFacts: "Building overview",
    residences: "residences",
    residentialLevels: "residential levels",
    poolRoof: "with pool",
    restaurant: "restaurant",
    parking: "parking spaces",
    inventoryNote: "Areas per floor plans · prices and availability synced with the master inventory",
    salesAssistant: "Sales assistant",
    answerQuestions: "Ask me anything",
    availableNow: "Available now",
    closeConcierge: "Close concierge",
    betterView: "Best view",
    compare: "Compare 301 / 302",
    payment: "Payment options",
    writeQuestion: "Type your question…",
    questionAria: "Question for the sales assistant",
    sendQuestion: "Send question",
    interiorsOf: "Interiors of",
    planOf: "Floor plan of",
    tourOf: "360° tour of",
    planVersion: "Floor plan version",
    color: "Color",
    clean: "No dimensions",
    dimensions: "With dimensions",
    backBuilding: "Back to building",
    residenceContent: "Residence content",
    interiors: "Interiors",
    plan: "Floor plan",
    tour: "360° tour",
    closeInterior: "Close interior",
    previousInterior: "View previous interior image",
    nextInterior: "View next interior image",
    previousPlan: "View previous floor plan version",
    nextPlan: "View next floor plan version",
    referenceNotice: "Reference image notice",
    referenceImage: "Reference image",
    sameGeometry: "Same layout, view from another level",
    tourReferenceNotice: "Reference tour notice",
    tourReference: "Reference tour",
    sameTourGeometry: "Same layout, view from the upper level",
    tourLoading: "Loading 360° tour…",
    requestReal: "Request actual view",
    understood: "Got it",
    languageLabel: "Switch to Spanish",
    currencyLabel: "Switch currency",
    mapLabel: "View location on the map",
    mapTitle: "Las Verandas location",
    mapDescription: "Olas Altas 601 · Romantic Zone · Puerto Vallarta",
    mapAddress: "Olas Altas 601, Romantic Zone, Amapas, 48399 Puerto Vallarta, Jalisco",
    generalPlans: "General floor plans",
    generalPlansShort: "Plans",
    generalPlansAria: "Open general building floor plans",
    chooseGeneralPlan: "Select level",
    previousGeneralPlan: "View previous general floor plan",
    nextGeneralPlan: "View next general floor plan",
    closeGeneralPlans: "Close general floor plans",
    generalPlanOf: "General floor plan of",
    swipeGeneralPlans: "Pinch to zoom · release to return · swipe to change levels",
    zoomPlan: "Zoomable plan. Pinch with two fingers to inspect it; release to return smoothly to the full view, or double-tap to reset completely.",
    zoomPlanHint: "Pinch to zoom · release or double-tap to return",
    zoomImage: "Zoomable image. Pinch with two fingers to inspect it; release to return smoothly to the full view, or double-tap to reset completely.",
    zoomImageHint: "Pinch to zoom · release or double-tap to return",
    downloadPlan: "Download plan",
    brandHome: "Return to the presentation and instructions",
  },
} as const;

function residenceName(unit: Residence, language: Language) {
  if (unit.id.startsWith("PH")) return `Penthouse ${unit.id}`;
  return `${language === "es" ? "Residencia" : "Residence"} ${unit.id}`;
}

function residenceEyebrow(unit: Residence, language: Language) {
  if (language === "es") return unit.beds === 1 ? "Una recámara" : "Dos recámaras";
  return unit.beds === 1 ? "One bedroom" : "Two bedrooms";
}

function residenceDescription(unit: Residence, language: Language) {
  if (unit.id.startsWith("PH")) {
    return language === "es"
      ? "Penthouse de dos recámaras y dos baños en el nivel superior, debajo del roof con alberca."
      : "Two-bedroom, two-bathroom penthouse on the upper level, directly below the rooftop pool.";
  }
  return language === "es"
    ? `Residencia de ${unit.beds === 1 ? "una recámara" : "dos recámaras"} con ${unit.area.toFixed(2)} m² de área total en el nivel ${unit.level}.`
    : `${unit.beds === 1 ? "One-bedroom residence" : "Two-bedroom residence"} with ${unit.area.toFixed(2)} m² of total area on level ${unit.level}.`;
}

function formatPrice(valueUsd: number, currency: Currency, mxnPerUsd: number, language: Language) {
  const value = currency === "MXN" ? valueUsd * mxnPerUsd : valueUsd;
  return `$${new Intl.NumberFormat(language === "es" ? "es-MX" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value)} ${currency}`;
}

function statusLabel(status: UnitStatus, language: Language) {
  if (language === "es") return status;
  if (status === "Apartada") return "Reserved";
  if (status === "Vendida") return "Sold";
  return "Available";
}

function statusClass(status: UnitStatus) {
  if (status === "Apartada") return "is-reserved";
  if (status === "Vendida") return "is-sold";
  return "is-available";
}

type ChatItem = { author: "concierge" | "visitor"; text: string };
type SwipeOrigin = { pointerId: number; x: number; y: number } | null;
type RevealDragOrigin = {
  pointerId: number;
  startY: number;
  startOffset: number;
  moved: boolean;
} | null;
type InventoryPayload = {
  units: Array<{ id: UnitId; price: number; status: UnitStatus }>;
  mxnPerUsd: number;
  refreshMinutes?: number;
};

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
  const [mxnPerUsd, setMxnPerUsd] = useState(17.0427);
  const [residences, setResidences] = useState<Residence[]>(initialResidences);
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
  const reservedCount = residences.filter((unit) => unit.status === "Apartada").length;
  const soldCount = residences.filter((unit) => unit.status === "Vendida").length;

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    async function syncInventory() {
      let refreshMinutes = 5;
      try {
        const response = await fetch("/api/inventory", { cache: "no-store" });
        if (!response.ok) throw new Error("Inventory source unavailable");
        const payload = await response.json() as InventoryPayload;
        refreshMinutes = Math.max(1, payload.refreshMinutes ?? 5);
        if (cancelled) return;
        setMxnPerUsd(payload.mxnPerUsd);
        setResidences((current) => current.map((unit) => {
          const update = payload.units.find((item) => item.id === unit.id);
          return update ? { ...unit, price: update.price, status: update.status } : unit;
        }));
      } catch {
        // The embedded inventory remains usable if the published Sheet is unavailable.
      } finally {
        if (!cancelled) refreshTimer = setTimeout(syncInventory, refreshMinutes * 60_000);
      }
    }

    void syncInventory();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, []);

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
    const nextLanguage: Language = language === "es" ? "en" : "es";
    setLanguage(nextLanguage);
    setCurrency(nextLanguage === "es" ? "MXN" : "USD");
    setChat([{
      author: "concierge",
      text: nextLanguage === "es"
        ? "Bienvenido a Las Verandas de Olas Altas. Puedo ayudarte a elegir una residencia sin sacarte de la experiencia."
        : "Welcome to Las Verandas de Olas Altas. I can help you choose a residence without taking you out of the experience.",
    }]);
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

  function answerFor(raw: string) {
    const text = raw.toLowerCase();
    if (text.includes("dron") || text.includes("vista real") || text.includes("fotografía real") || text.includes("actual view") || text.includes("real photo")) {
      const name = selected ? residenceName(selected, language) : language === "es" ? "la residencia que elijas" : "the residence you choose";
      return language === "es"
        ? `Podemos coordinar una fotografía de dron desde la altura y orientación aproximadas de ${name}. Agenda una cita con nuestro asesor de ventas para preparar la vista real de esa unidad.`
        : `We can coordinate a drone photograph from the approximate height and orientation of ${name}. Schedule an appointment with our sales advisor so the team can prepare that residence's actual view.`;
    }
    if (text.includes("compar")) {
      const unit301 = residences.find((unit) => unit.id === "301")!;
      const unit302 = residences.find((unit) => unit.id === "302")!;
      return language === "es"
        ? `La 301 tiene 76.90 m² y precio de ${formatPrice(unit301.price, currency, mxnPerUsd, language)}; la 302 aumenta a 89.28 m² y ${formatPrice(unit302.price, currency, mxnPerUsd, language)}. La 301 está ${statusLabel(unit301.status, language).toLowerCase()} y la 302 ${statusLabel(unit302.status, language).toLowerCase()}.`
        : `Residence 301 has 76.90 m² and is listed at ${formatPrice(unit301.price, currency, mxnPerUsd, language)}; 302 increases to 89.28 m² and ${formatPrice(unit302.price, currency, mxnPerUsd, language)}. Residence 301 is ${statusLabel(unit301.status, language).toLowerCase()} and 302 is ${statusLabel(unit302.status, language).toLowerCase()}.`;
    }
    if (text.includes("vista") || text.includes("mar") || text.includes("atardecer") || text.includes("view") || text.includes("ocean") || text.includes("sunset")) {
      const ph1 = residences.find((unit) => unit.id === "PH1")!;
      return language === "es"
        ? `Los penthouses PH1 y PH2 ocupan el nivel más alto, justo debajo del roof con alberca. PH1 está ${statusLabel(ph1.status, language).toLowerCase()} en el inventario actual.`
        : `Penthouses PH1 and PH2 occupy the highest level, directly below the rooftop pool. PH1 is currently ${statusLabel(ph1.status, language).toLowerCase()}.`;
    }
    if (text.includes("pago") || text.includes("enganche") || text.includes("aparta") || text.includes("payment") || text.includes("deposit") || text.includes("reserve")) {
      return language === "es"
        ? "El material recibido no especifica el esquema de pago. Puedo ayudarte a solicitar el plan comercial correspondiente a la residencia que elijas."
        : "The supplied materials do not specify a payment schedule. I can help you request the commercial plan for the residence you choose.";
    }
    if (text.includes("precio") || text.includes("presupuesto") || text.includes("price") || text.includes("budget")) {
      const prices = residences.map((unit) => unit.price);
      const available = residences.filter((unit) => unit.status === "Disponible").sort((a, b) => a.price - b.price)[0]
        ?? residences.slice().sort((a, b) => a.price - b.price)[0];
      return language === "es"
        ? `Los precios van de ${formatPrice(Math.min(...prices), currency, mxnPerUsd, language)} a ${formatPrice(Math.max(...prices), currency, mxnPerUsd, language)}. Entre las disponibles, ${residenceName(available, language)} inicia en ${formatPrice(available.price, currency, mxnPerUsd, language)}.`
        : `Prices range from ${formatPrice(Math.min(...prices), currency, mxnPerUsd, language)} to ${formatPrice(Math.max(...prices), currency, mxnPerUsd, language)}. Among the available residences, ${residenceName(available, language)} starts at ${formatPrice(available.price, currency, mxnPerUsd, language)}.`;
    }
    if (selected) {
      return language === "es"
        ? `${residenceName(selected, language)}: ${selected.area.toFixed(2)} m², ${selected.beds} ${selected.beds === 1 ? t.bedroom : t.bedrooms}, ${selected.baths} ${selected.baths === 1 ? t.bathroom : t.bathrooms} y precio de ${formatPrice(selected.price, currency, mxnPerUsd, language)}. Estado: ${statusLabel(selected.status, language)}.`
        : `${residenceName(selected, language)}: ${selected.area.toFixed(2)} m², ${selected.beds} ${selected.beds === 1 ? t.bedroom : t.bedrooms}, ${selected.baths} ${selected.baths === 1 ? t.bathroom : t.bathrooms}, listed at ${formatPrice(selected.price, currency, mxnPerUsd, language)}. Status: ${statusLabel(selected.status, language)}.`;
    }
    return language === "es"
      ? `El edificio integra 16 residencias: ${availableCount} disponibles, ${reservedCount} apartadas y ${soldCount} vendidas. Puedo buscar por presupuesto, nivel o disponibilidad.`
      : `The building includes 16 residences: ${availableCount} available, ${reservedCount} reserved, and ${soldCount} sold. I can search by budget, level, or availability.`;
  }

  function ask(raw: string) {
    const clean = raw.trim();
    if (!clean) return;
    setChat((items) => [
      ...items,
      { author: "visitor", text: clean },
      { author: "concierge", text: answerFor(clean) },
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
            <div className="header-availability">
              <i />
              <span><strong>{String(availableCount).padStart(2, "0")}</strong> {t.availableOf}</span>
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
              {t.inventoryNote}
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
              <div><strong>{t.salesAssistant}</strong><small><i /> {t.availableNow}</small></div>
              <button type="button" onClick={() => setConciergeOpen(false)} aria-label={t.closeConcierge}><X /></button>
            </div>
            <div className="concierge-log" aria-live="polite">
              {chat.slice(-3).map((item, index) => (
                <p key={`${item.author}-${index}`} className={item.author}>
                  {item.text}
                </p>
              ))}
            </div>
            <div className="concierge-prompts">
              <button type="button" onClick={() => ask(language === "es" ? "¿Cuál tiene mejor vista?" : "Which residence has the best view?")}>{t.betterView}</button>
              <button type="button" onClick={() => ask(language === "es" ? "Compara 301 y 302" : "Compare 301 and 302")}>{t.compare}</button>
              <button type="button" onClick={() => ask(language === "es" ? "¿Cuál es el esquema de pago?" : "What are the payment options?")}>{t.payment}</button>
            </div>
            <form onSubmit={submitQuestion} className="concierge-input">
              <MessageCircle />
              <input
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
        {(selected || selectedAmenity) && (
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
