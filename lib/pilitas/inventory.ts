import type { UnitId, UnitStatus } from "./types";
import {contactConfig, type ContactConfig} from "./contact";
export const UNIT_IDS: readonly UnitId[] = ["201","202","203","204","301","302","303","304","401","402","403","404","501","502","PH1","PH2"];
const statuses: readonly UnitStatus[] = ["Disponible","Apartada","Vendida"];
export type Inventory = { units: Array<{id: UnitId; price: number; status: UnitStatus}>; mxnPerUsd: number; refreshMinutes: number; updatedAt: string; contacts: ContactConfig };

export function validateInventory(value: unknown): Inventory {
  if (!value || typeof value !== "object") throw new Error("Invalid inventory");
  const p = value as Partial<Inventory>;
  if (!Array.isArray(p.units) || p.units.length !== UNIT_IDS.length) throw new Error("Expected 16 unique units");
  const ids = new Set<string>();
  for (const unit of p.units) {
    if (!unit || !UNIT_IDS.includes(unit.id) || ids.has(unit.id)) throw new Error("Unknown or duplicate unit");
    if (typeof unit.price !== "number" || !Number.isFinite(unit.price) || unit.price <= 0 || unit.price > 1e12) throw new Error("Invalid price");
    if (!statuses.includes(unit.status)) throw new Error("Invalid status");
    ids.add(unit.id);
  }
  if (typeof p.mxnPerUsd !== "number" || !Number.isFinite(p.mxnPerUsd) || p.mxnPerUsd <= 0 || p.mxnPerUsd > 1e6) throw new Error("Invalid exchange rate");
  if (typeof p.refreshMinutes !== "number" || !Number.isFinite(p.refreshMinutes) || p.refreshMinutes < 1 || p.refreshMinutes > 60) throw new Error("Refresh interval must be between 1 and 60 minutes");
  if (typeof p.updatedAt !== "string" || !Number.isFinite(Date.parse(p.updatedAt))) throw new Error("Invalid update timestamp");
  return {...p, contacts: contactConfig(p.contacts)} as Inventory;
}

// Decimal point and optional comma thousands groups; reject ambiguous regional formats.
export function parsePrice(raw: string): number {
  const value = raw.trim().replace(/^(?:USD\s*|\$\s*)/i, "").replace(/\s+USD$/i, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) throw new Error("Price must use a decimal point and numeric digits");
  const price = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(price) || price <= 0 || price > 1e12) throw new Error("Invalid price");
  return price;
}

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  const finishField = () => { row.push(field.trim()); field = ""; closed = false; };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === '"') {
      if (field.trim() || closed) throw new Error("Malformed CSV quote");
      field = ""; quoted = true;
    } else if (char === ",") finishField();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      finishField(); if (row.some(Boolean)) rows.push(row); row = [];
    } else {
      if (closed && char.trim()) throw new Error("Malformed CSV field");
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  finishField(); if (row.some(Boolean)) rows.push(row);
  return rows;
}
function normalize(value: string) {
  return value.replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
export function inventoryFromCsv(inventoryCsv: string, settingsCsv: string, updatedAt: string): Inventory {
  const rows = parseCsv(inventoryCsv);
  const header = (rows.shift() ?? []).map(normalize);
  const indexes = ["unidad", "precio base en usd", "estado"].map(name => header.indexOf(name));
  if (indexes.some(i => i < 0) || new Set(header).size !== header.length) throw new Error("Invalid inventory column headers");
  const settingsRows = parseCsv(settingsCsv);
  if ((settingsRows.shift() ?? []).length !== 2) throw new Error("Expected configuration key/value columns");
  const settings = new Map<string, string>();
  for (const row of settingsRows) {
    const key = normalize(row[0] ?? "");
    if (settings.has(key)) throw new Error("Duplicate configuration key");
    settings.set(key, row[1] ?? "");
  }
  return validateInventory({
    units: rows.map(row => ({id: row[indexes[0]]?.trim().toUpperCase(), price: parsePrice(row[indexes[1]] ?? ""), status: row[indexes[2]]?.trim()})),
    mxnPerUsd: Number(settings.get("mxn_por_usd")),
    refreshMinutes: settings.has("actualizar_cada_minutos") ? Number(settings.get("actualizar_cada_minutos")) : 5,
    updatedAt,
    contacts: contactConfig({whatsapp: settings.get("ventas_whatsapp"), email: settings.get("ventas_email"), bookingUrl: settings.get("ventas_citas_url")}),
  });
}
