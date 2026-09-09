import {loadInventory} from "@/lib/pilitas/inventory-source";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await loadInventory(), {headers: {"Cache-Control": "no-store"}});
  } catch {
    return Response.json(
      {error: "Inventory unavailable. Please confirm prices and availability with sales."},
      {status: 503, headers: {"Cache-Control": "no-store", "Retry-After": "60"}},
    );
  }
}
