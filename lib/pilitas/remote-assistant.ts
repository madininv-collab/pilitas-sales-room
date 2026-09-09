import type {Currency, Language, Residence, UnitId} from "./types";

export type RemoteAssistantContext = {
  residences: Residence[];
  selectedId: UnitId | null;
  language: Language;
  currency: Currency;
  mxnPerUsd: number;
  isCurrent: boolean;
};

type Fetcher = typeof fetch;

export async function askRemoteAssistant(
  message: string,
  context: RemoteAssistantContext,
  options: {url?: string; fetcher?: Fetcher; timeoutMs?: number} = {},
): Promise<string | null> {
  const url = options.url ?? import.meta.env.VITE_SALES_ASSISTANT_API_URL?.trim();
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
  try {
    const response = await (options.fetcher ?? fetch)(parsed, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      signal: controller.signal,
      body: JSON.stringify({
        message,
        language: context.language,
        currency: context.currency,
        selectedUnit: context.selectedId,
        inventoryCurrent: context.isCurrent,
        mxnPerUsd: context.mxnPerUsd,
        residences: context.residences.map(({id, beds, baths, area, level, price, status}) => ({
          id, beds, baths, area, level, price, status,
        })),
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as {answer?: unknown};
    const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
    return answer && answer.length <= 4000 ? answer : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
