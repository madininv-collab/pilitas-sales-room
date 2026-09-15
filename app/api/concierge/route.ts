import { z } from "zod";
import { localParserProvider } from "@/lib/concierge/providers/local-parser";
import { TOOL_DESCRIPTORS } from "@/lib/concierge/tools/registry";
import { createKnowledgeStore } from "@/lib/concierge/knowledge/store";
import type { ConciergeContext } from "@/lib/concierge/contracts";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z.record(z.unknown()),
  conversationState: z.record(z.unknown()).optional(),
  history: z
    .array(
      z.object({
        author: z.enum(["visitor", "concierge"]),
        text: z.string().max(1000),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = RequestSchema.safeParse(json);

    if (!parseResult.success) {
      return Response.json(
        {
          error: "Invalid request payload",
          details: parseResult.error.format(),
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { message, context } = parseResult.data;

    // Verify if an AI API key is configured on the server
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!geminiApiKey && !openaiApiKey) {
      // Phase 1: Local rule-based parser fallback
      // Uses the same verified knowledge store and tools registry without paid API keys
      const store = createKnowledgeStore();
      const decision = await localParserProvider.interpret({
        text: message,
        context: context as unknown as ConciergeContext,
        knowledgeStore: store,
        tools: TOOL_DESCRIPTORS,
      });

      return Response.json(
        {
          status: "success",
          providerMode: "local_rules",
          decision,
          serverConfig: {
            hasLiveModel: false,
            configuredProvider: null,
            supportedToolsCount: TOOL_DESCRIPTORS.length,
          },
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Phase 2 Gateway Hook:
    // When GEMINI_API_KEY or OPENAI_API_KEY is provided in environment variables,
    // this endpoint routes to the upstream model with strict tool call schema verification.
    return Response.json(
      {
        status: "ready_for_phase2",
        providerMode: geminiApiKey ? "gemini" : "openai",
        message: "Server AI gateway configured. Ready for streaming / tool calls.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return Response.json(
      {
        error: "Concierge gateway error",
        message: errorMessage,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
