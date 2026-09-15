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
export const PlanViewSchema = z.enum(["color", "clean", "dimensions"]);
export const HighlightTargetTypeSchema = z.enum(["residence", "amenity", "control", "plan_region"]);

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
  view: PlanViewSchema.optional(),
}).strict();

export const CloseFloorPlanActionSchema = z.object({
  type: z.literal("close_floor_plan"),
}).strict();

export const SetPlanViewActionSchema = z.object({
  type: z.literal("set_plan_view"),
  view: PlanViewSchema,
}).strict();

export const ShowAmenityActionSchema = z.object({
  type: z.literal("show_amenity"),
  amenityId: AmenityIdSchema,
}).strict();

export const CloseAmenityActionSchema = z.object({
  type: z.literal("close_amenity"),
}).strict();

export const OpenTourActionSchema = z.object({
  type: z.literal("open_tour"),
  residenceId: UnitIdSchema,
}).strict();

export const CloseTourActionSchema = z.object({
  type: z.literal("close_tour"),
}).strict();

export const OpenMapActionSchema = z.object({
  type: z.literal("open_map"),
}).strict();

export const CloseMapActionSchema = z.object({
  type: z.literal("close_map"),
}).strict();

export const OpenGeneralPlansActionSchema = z.object({
  type: z.literal("open_general_plans"),
  index: z.number().int().min(0).max(7).optional(),
}).strict();

export const SetGeneralPlanIndexActionSchema = z.object({
  type: z.literal("set_general_plan_index"),
  index: z.number().int().min(0).max(7),
}).strict();

export const CloseGeneralPlansActionSchema = z.object({
  type: z.literal("close_general_plans"),
}).strict();

export const OpenInteriorGalleryActionSchema = z.object({
  type: z.literal("open_interior_gallery"),
  residenceId: UnitIdSchema,
  index: z.number().int().min(0).optional(),
}).strict();

export const SetGalleryIndexActionSchema = z.object({
  type: z.literal("set_gallery_index"),
  index: z.number().int().min(0),
}).strict();

export const SetHighlightActionSchema = z.object({
  type: z.literal("set_highlight"),
  targetType: HighlightTargetTypeSchema,
  targetId: z.string().min(1),
  label: z.string().optional(),
  regionCoordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
}).strict();

export const ClearHighlightActionSchema = z.object({
  type: z.literal("clear_highlight"),
}).strict();

export const SetLanguageActionSchema = z.object({
  type: z.literal("set_language"),
  language: LanguageSchema,
}).strict();

export const SetCurrencyActionSchema = z.object({
  type: z.literal("set_currency"),
  currency: CurrencySchema,
}).strict();

export const ListUnitsActionSchema = z.object({
  type: z.literal("list_units"),
  beds: z.number().int().optional(),
  maxPriceUsd: z.number().positive().optional(),
  minPriceUsd: z.number().positive().optional(),
  status: z.enum(["Disponible", "Apartada", "Vendida"]).optional(),
  facade: ViewIdSchema.optional(),
}).strict();

export const GetUnitDetailsActionSchema = z.object({
  type: z.literal("get_unit_details"),
  residenceId: UnitIdSchema,
}).strict();

export const GetProjectInformationActionSchema = z.object({
  type: z.literal("get_project_information"),
  topic: z.string().min(1),
}).strict();

export const RequestHumanHandoffActionSchema = z.object({
  type: z.literal("request_human_handoff"),
  reason: z.string().min(1),
  preferredChannel: z.enum(["whatsapp", "email", "appointment"]).optional(),
}).strict();

export const ConciergeActionSchema = z.discriminatedUnion("type", [
  SelectResidenceActionSchema,
  SetFacadeActionSchema,
  OpenInventoryActionSchema,
  CloseInventoryActionSchema,
  OpenFloorPlanActionSchema,
  CloseFloorPlanActionSchema,
  SetPlanViewActionSchema,
  ShowAmenityActionSchema,
  CloseAmenityActionSchema,
  OpenTourActionSchema,
  CloseTourActionSchema,
  OpenMapActionSchema,
  CloseMapActionSchema,
  OpenGeneralPlansActionSchema,
  SetGeneralPlanIndexActionSchema,
  CloseGeneralPlansActionSchema,
  OpenInteriorGalleryActionSchema,
  SetGalleryIndexActionSchema,
  SetHighlightActionSchema,
  ClearHighlightActionSchema,
  SetLanguageActionSchema,
  SetCurrencyActionSchema,
  ListUnitsActionSchema,
  GetUnitDetailsActionSchema,
  GetProjectInformationActionSchema,
  RequestHumanHandoffActionSchema,
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
