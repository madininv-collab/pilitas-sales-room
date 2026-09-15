import type {
  ConciergeAction,
  ConciergeContext,
  SalesRoomAdapter,
  ToolResult,
} from "../contracts";
import { parseConciergeAction } from "./schemas";

export async function executeTool(
  rawAction: unknown,
  context: ConciergeContext,
  adapter: SalesRoomAdapter
): Promise<ToolResult> {
  const parseResult = parseConciergeAction(rawAction);
  if (!parseResult.success) {
    return {
      ok: false,
      code: "INVALID_ARGUMENTS",
      message: `Invalid action arguments: ${parseResult.error}`,
    };
  }

  const action: ConciergeAction = parseResult.data;

  // Verify tool support
  if (!context.capabilities.supportedTools.includes(action.type)) {
    return {
      ok: false,
      code: "UNKNOWN_TOOL",
      message: `Action '${action.type}' is not supported in current capabilities`,
    };
  }

  // Pre-condition validations
  if (action.type === "select_residence" || action.type === "open_floor_plan") {
    const exists = context.inventory.residences.some((u) => u.id === action.residenceId);
    if (!exists) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: `Residence '${action.residenceId}' does not exist in inventory`,
      };
    }
  }

  if (action.type === "open_tour") {
    const exists = context.inventory.residences.some((u) => u.id === action.residenceId);
    if (!exists) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: `Residence '${action.residenceId}' does not exist in inventory`,
      };
    }
    const hasTour = context.capabilities.availableTours.includes(action.residenceId);
    if (!hasTour) {
      return {
        ok: false,
        code: "NOT_AVAILABLE",
        message: `Virtual tour is not available for residence '${action.residenceId}'`,
      };
    }
  }

  try {
    return await adapter.execute(action);
  } catch (error) {
    return {
      ok: false,
      code: "EXECUTION_FAILED",
      message: error instanceof Error ? error.message : "Unexpected execution error",
    };
  }
}
