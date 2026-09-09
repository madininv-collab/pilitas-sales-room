"use client";
/* eslint-disable @next/next/no-img-element -- Architectural images preserve their original alignment. */

import {useEffect, useRef, useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {MOBILE_GESTURE_MEDIA} from "@/lib/pilitas/types";

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

export function ZoomablePlan({
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
    if (transformRef.current.scale > 1 && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const step = event.shiftKey ? 100 : 40;
      applyTransform(transformRef.current.scale,
        transformRef.current.x + (event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0),
        transformRef.current.y + (event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0));
    } else if (event.key === "+" || event.key === "=") {
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

