"use client";

import { useState, useEffect } from "react";
import type { UnitId } from "@/lib/pilitas/types";

interface DevDiagnosticPanelProps {
  selectedUnitId: UnitId | null;
}

export function DevDiagnosticPanel({ selectedUnitId }: DevDiagnosticPanelProps) {
  // Never render in production builds
  if (!import.meta.env.DEV) {
    return null;
  }

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { width, height } = dimensions;

  let breakpoint = "Desktop";
  if (width < 768) {
    breakpoint = "Mobile";
  } else if (width < 1200) {
    breakpoint = "Tablet";
  }

  return (
    <aside
      aria-label="Diagnóstico de desarrollo"
      style={{
        position: "fixed",
        bottom: "8px",
        left: "8px",
        zIndex: 99999,
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: "monospace",
        fontSize: "11px",
        lineHeight: "1.4",
        backgroundColor: "rgba(11, 13, 10, 0.88)",
        color: "#f4f0e8",
        border: "1px solid rgba(185, 220, 85, 0.4)",
        borderRadius: "6px",
        padding: "5px 9px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "#b9dc55",
            display: "inline-block",
          }}
        />
        <span style={{ color: "#b9dc55", fontWeight: "bold" }}>DEV</span>
      </div>
      <div>
        <span>{width}×{height}</span>
      </div>
      <div style={{ opacity: 0.4 }}>|</div>
      <div>
        <span style={{ color: breakpoint === "Desktop" ? "#b9dc55" : breakpoint === "Tablet" ? "#d4aa67" : "#60a5fa", fontWeight: 600 }}>
          {breakpoint}
        </span>
      </div>
      <div style={{ opacity: 0.4 }}>|</div>
      <div>
        <span>Unidad: </span>
        <strong style={{ color: selectedUnitId ? "#b9dc55" : "rgba(244, 240, 232, 0.6)" }}>
          {selectedUnitId ?? "Ninguna"}
        </strong>
      </div>
    </aside>
  );
}
