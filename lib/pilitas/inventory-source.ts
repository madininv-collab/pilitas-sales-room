import {inventoryFromCsv, type Inventory} from "./inventory";
import {DEFAULT_SPREADSHEET} from "./inventory-config";
const MAX_BYTES = 256 * 1024;
export function createInventoryLoader({fetcher = fetch, now = Date.now, timeoutMs = 8000, spreadsheetId = DEFAULT_SPREADSHEET} = {}) {
  let cached: Inventory | undefined;
  let expires = 0;
  let inFlight: Promise<Inventory> | undefined;
  async function readSheet(sheet: string, signal: AbortSignal) {
    if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) throw new Error("Invalid spreadsheet ID");
    const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
    url.searchParams.set("tqx", "out:csv");
    url.searchParams.set("sheet", sheet);
    const response = await fetcher(url, {cache: "no-store", signal});
    if (!response.ok) throw new Error(`Inventory source unavailable (${response.status})`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty inventory response");
    let size = 0, text = "";
    const decoder = new TextDecoder();
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw new Error("Inventory response too large"); }
        text += decoder.decode(value, {stream: true});
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    if (/<html[\s>]/i.test(text)) throw new Error("Inventory source requires sign-in");
    return text;
  }
  return async function load(): Promise<Inventory> {
    if (cached && now() < expires) return cached;
    if (inFlight) return inFlight;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    inFlight = Promise.all([readSheet("Inventario", controller.signal), readSheet("Configuración", controller.signal)])
      .then(([units, settings]) => {
        const result = inventoryFromCsv(units, settings, new Date(now()).toISOString());
        cached = result; expires = now() + 60_000;
        return result;
      }).finally(() => { clearTimeout(timer); controller.abort(); inFlight = undefined; });
    return inFlight;
  };
}
export const loadInventory = createInventoryLoader({spreadsheetId: process.env.INVENTORY_SPREADSHEET_ID || DEFAULT_SPREADSHEET});
