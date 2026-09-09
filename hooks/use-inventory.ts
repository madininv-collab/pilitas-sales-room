"use client";
import {useEffect, useState} from "react";
import {initialResidences} from "@/lib/pilitas/catalog";
import {validateInventory} from "@/lib/pilitas/inventory";
import {defaultContacts} from "@/lib/pilitas/contact";
import {loadBrowserInventory} from "@/lib/pilitas/browser-inventory";
export function useInventory() {
  const [snapshot, setSnapshot] = useState({residences: initialResidences, mxnPerUsd: 17.0427, updatedAt: null as string | null, contacts: defaultContacts});
  const [syncStatus, setSyncStatus] = useState<"loading" | "synced" | "unavailable">("loading");
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function sync() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      let minutes = 1;
      try {
        const payload = import.meta.env.VITE_STATIC_HOSTING === "github-pages"
          ? await loadBrowserInventory(controller.signal)
          : validateInventory(await fetch("/api/inventory", {cache: "no-store", signal: controller.signal}).then(response => {
              if (!response.ok) throw new Error("Inventory unavailable");
              return response.json();
            }));
        if (disposed) return;
        const updates = new Map(payload.units.map(unit => [unit.id, unit]));
        setSnapshot({residences: initialResidences.map(unit => ({...unit, ...updates.get(unit.id)!})), mxnPerUsd: payload.mxnPerUsd, updatedAt: payload.updatedAt, contacts: payload.contacts});
        setSyncStatus("synced");
        minutes = payload.refreshMinutes;
      } catch {
        if (!disposed) setSyncStatus("unavailable");
      } finally {
        clearTimeout(timeout);
        if (!disposed) timer = setTimeout(sync, minutes * 60_000);
      }
    }
    void sync();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); };
  }, []);
  return {...snapshot, syncStatus};
}
