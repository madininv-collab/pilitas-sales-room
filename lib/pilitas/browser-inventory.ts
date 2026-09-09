import {inventoryFromCsv} from "./inventory";
import {DEFAULT_SPREADSHEET} from "./inventory-config";

const MAX_CSV_SIZE = 256 * 1024;

async function readCsv(response: Response): Promise<string> {
  if (!response.ok) throw new Error("Inventory source unavailable");
  const text = await response.text();
  if (text.length > MAX_CSV_SIZE || /^\s*</.test(text)) {
    throw new Error("Invalid inventory response");
  }
  return text;
}

export async function loadBrowserInventory(signal: AbortSignal) {
  const spreadsheetId =
    import.meta.env.VITE_INVENTORY_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET;
  const source = (sheet: string) =>
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const [inventory, settings] = await Promise.all([
    fetch(source("Inventario"), {cache: "no-store", signal}).then(readCsv),
    fetch(source("Configuración"), {cache: "no-store", signal}).then(readCsv),
  ]);
  return inventoryFromCsv(inventory, settings, new Date().toISOString());
}
