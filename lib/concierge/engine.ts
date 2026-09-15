import type {
  ConciergeAction,
  ConciergeContext,
  ConciergeEngine,
  ConciergeProvider,
  ConciergeTurnResult,
  SalesRoomAdapter,
  ToolResult,
} from "./contracts";
import { executeTool } from "./tools/execute";
import { TOOL_DESCRIPTORS } from "./tools/registry";
import { localParserProvider } from "./providers/local-parser";

export interface ConciergeEngineConfig {
  readonly provider?: ConciergeProvider;
  readonly salesRoom: SalesRoomAdapter;
}

export function createConciergeEngine(config: ConciergeEngineConfig): ConciergeEngine {
  const provider = config.provider ?? localParserProvider;
  const salesRoom = config.salesRoom;

  return {
    getContext(): ConciergeContext {
      return salesRoom.getContext();
    },

    async executeAction(action: ConciergeAction): Promise<ToolResult> {
      const context = salesRoom.getContext();
      return executeTool(action, context, salesRoom);
    },

    async handle(input: { text: string; signal?: AbortSignal }): Promise<ConciergeTurnResult> {
      if (input.signal?.aborted) {
        throw new Error("Turn aborted before processing");
      }

      const contextBefore = salesRoom.getContext();

      const decision = await provider.interpret({
        text: input.text,
        context: contextBefore,
        tools: TOOL_DESCRIPTORS,
        signal: input.signal,
      });

      if (input.signal?.aborted) {
        throw new Error("Turn aborted after provider interpretation");
      }

      if (decision.kind === "action") {
        const toolResult = await executeTool(decision.action, contextBefore, salesRoom);
        const contextAfter = toolResult.ok ? toolResult.contextAfter : contextBefore;

        return {
          text: input.text,
          decision,
          toolResult,
          contextBefore,
          contextAfter,
        };
      }

      // If reply, clarification, or unsupported -> no mutation
      return {
        text: input.text,
        decision,
        contextBefore,
        contextAfter: contextBefore,
      };
    },
  };
}
