import { z } from "zod";
import type { ConciergeAction } from "../contracts";

export const UnitIdSchema = z.enum([
  "201", "202", "203", "204",
  "301", "302", "303", "304",
  "401", "402", "403", "404",
  "501", "502", "PH1", "PH2",
]);

export const ViewIdSchema = z.enum(["front", "rear"]);
export const AmenityIdSchema = z.enum(["lobby", "rooftop"]);
export const LanguageSchema = z.enum(["es", "en"]);
export const CurrencySchema = z.enum(["MXN", "USD"]);

export const SelectResidenceActionSchema = z.object({
  type: z.literal("select_residence"),
  residenceId: UnitIdSchema,
}).strict();

export const SetFacadeActionSchema = z.object({
  type: z.literal("set_facade"),
  facade: ViewIdSchema,
}).strict();

export const OpenInventoryActionSchema = z.object({
  type: z.literal("open_inventory"),
}).strict();

export const CloseInventoryActionSchema = z.object({
  type: z.literal("close_inventory"),
}).strict();

export const OpenFloorPlanActionSchema = z.object({
  type: z.literal("open_floor_plan"),
  residenceId: UnitIdSchema,
}).strict();

export const CloseFloorPlanActionSchema = z.object({
  type: z.literal("close_floor_plan"),
}).strict();

export const ShowAmenityActionSchema = z.object({
  type: z.literal("show_amenity"),
  amenityId: AmenityIdSchema,
}).strict();

export const OpenTourActionSchema = z.object({
  type: z.literal("open_tour"),
  residenceId: UnitIdSchema,
}).strict();

export const SetLanguageActionSchema = z.object({
  type: z.literal("set_language"),
  language: LanguageSchema,
}).strict();

export const SetCurrencyActionSchema = z.object({
  type: z.literal("set_currency"),
  currency: CurrencySchema,
}).strict();

export const ConciergeActionSchema = z.discriminatedUnion("type", [
  SelectResidenceActionSchema,
  SetFacadeActionSchema,
  OpenInventoryActionSchema,
  CloseInventoryActionSchema,
  OpenFloorPlanActionSchema,
  CloseFloorPlanActionSchema,
  ShowAmenityActionSchema,
  OpenTourActionSchema,
  SetLanguageActionSchema,
  SetCurrencyActionSchema,
]);

export function parseConciergeAction(input: unknown):
  | { readonly success: true; readonly data: ConciergeAction }
  | { readonly success: false; readonly error: string } {
  const result = ConciergeActionSchema.safeParse(input);
  if (!result.success) {
    const errorMsg = result.error.issues
      .map((issue) => `${issue.path.join(".") || "action"}: ${issue.message}`)
      .join("; ");
    return { success: false, error: errorMsg };
  }
  return { success: true, data: result.data as ConciergeAction };
}
