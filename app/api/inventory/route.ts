const SPREADSHEET_ID = "13iLBwV83HAcR2eZvbq2vKU--mhTVCBv0Fcfjkvw777w";
const VALID_UNITS = new Set([
  "201", "202", "203", "204",
  "301", "302", "303", "304",
  "401", "402", "403", "404",
  "501", "502", "PH1", "PH2",
]);
const VALID_STATUSES = new Set(["Disponible", "Apartada", "Vendida"]);

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

async function fetchSheet(sheet: string) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheet);
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.text();
  if (!response.ok || /<html[\s>]/i.test(body)) {
    throw new Error(`Google Sheet ${sheet} is not published for read-only access.`);
  }
  return parseCsv(body);
}

export async function GET() {
  try {
    const [inventoryRows, settingsRows] = await Promise.all([
      fetchSheet("Inventario"),
      fetchSheet("Configuración"),
    ]);

    const units = inventoryRows.slice(1).flatMap((row) => {
      const id = row[0]?.toUpperCase();
      const price = Number((row[1] ?? "").replace(/[^0-9.-]/g, ""));
      const status = row[2];
      if (!VALID_UNITS.has(id) || !Number.isFinite(price) || price <= 0 || !VALID_STATUSES.has(status)) return [];
      return [{ id, price, status }];
    });

    const settings = Object.fromEntries(settingsRows.slice(1).map((row) => [row[0], row[1]]));
    const mxnPerUsd = Number(settings.mxn_por_usd);
    const refreshMinutes = Number(settings.actualizar_cada_minutos);

    if (units.length !== 16 || !Number.isFinite(mxnPerUsd) || mxnPerUsd <= 0) {
      throw new Error("The master inventory is incomplete or contains invalid values.");
    }

    return Response.json(
      {
        units,
        mxnPerUsd,
        refreshMinutes: Number.isFinite(refreshMinutes) && refreshMinutes >= 1 ? refreshMinutes : 5,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Inventory sync failed." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
