import type {
  AmenityId,
  Currency,
  Language,
  PlanView,
  UnitId,
  ViewId,
} from "../../pilitas/types";
import { hotspots, generalPlans, virtualTours } from "../../pilitas/catalog";
import type {
  ActiveHighlight,
  ConciergeAction,
  ConciergeContext,
  SalesRoomAdapter,
  ToolResult,
} from "../contracts";

export interface SalesRoomHandlerBridge {
  getContext(): ConciergeContext;
  selectResidence(id: UnitId): void;
  setFacade(facade: ViewId): void;
  openInventory(): void;
  closeInventory(): void;
  openFloorPlan(id: UnitId, view?: PlanView): void;
  closeExperience(): void;
  setPlanView?(view: PlanView): void;
  showAmenity(amenityId: AmenityId): void;
  closeAmenity?(): void;
  openTour(id: UnitId): void;
  closeTour?(): void;
  openMap?(): void;
  closeMap?(): void;
  openGeneralPlans?(index?: number): void;
  setGeneralPlanIndex?(index: number): void;
  closeGeneralPlans?(): void;
  openInteriorGallery?(id: UnitId, index?: number): void;
  setGalleryIndex?(index: number): void;
  setHighlight?(highlight: ActiveHighlight): void;
  clearHighlight?(): void;
  setLanguage(language: Language): void;
  setCurrency(currency: Currency): void;
}

type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? Array<DeepMutable<U>>
    : T[P] extends object
    ? DeepMutable<T[P]>
    : T[P];
};

function cloneContext(ctx: ConciergeContext): ConciergeContext {
  return JSON.parse(JSON.stringify(ctx)) as ConciergeContext;
}

export function createSalesRoomAdapter(bridge: SalesRoomHandlerBridge): SalesRoomAdapter {
  return {
    getContext(): ConciergeContext {
      return bridge.getContext();
    },

    async execute(action: ConciergeAction): Promise<ToolResult> {
      const before = bridge.getContext();
      const after = cloneContext(before);
      const mutableAfter = after as DeepMutable<ConciergeContext>;

      const frontHotspotIds = new Set(hotspots.front.map((zone) => zone.id));
      const rearHotspotIds = new Set(hotspots.rear.map((zone) => zone.id));

      switch (action.type) {
        case "select_residence": {
          const unitId = action.residenceId;
          const unit = before.inventory.residences.find((u) => u.id === unitId);
          if (!unit) {
            return {
              ok: false,
              code: "NOT_FOUND",
              message: `Residence ${unitId} not found in inventory`,
            };
          }

          let targetFacade = before.navigation.activeFacade;
          if (targetFacade === "front" && !frontHotspotIds.has(unitId) && rearHotspotIds.has(unitId)) {
            targetFacade = "rear";
          } else if (targetFacade === "rear" && !rearHotspotIds.has(unitId) && frontHotspotIds.has(unitId)) {
            targetFacade = "front";
          }

          bridge.selectResidence(unitId);

          mutableAfter.navigation.selectedResidenceId = unitId;
          mutableAfter.navigation.selectedAmenityId = null;
          mutableAfter.navigation.activeFacade = targetFacade;
          mutableAfter.navigation.inventoryOpen = false;
          mutableAfter.project.mode = "exploring";

          return { ok: true, action, contextAfter: after };
        }

        case "set_facade": {
          const targetFacade = action.facade;
          const isSame = before.navigation.activeFacade === targetFacade;

          bridge.setFacade(targetFacade);
          mutableAfter.navigation.activeFacade = targetFacade;

          if (!isSame) {
            const currentSelected = before.navigation.selectedResidenceId;
            if (currentSelected) {
              const visibleInNew = targetFacade === "front"
                ? frontHotspotIds.has(currentSelected)
                : rearHotspotIds.has(currentSelected);
              if (!visibleInNew) {
                mutableAfter.navigation.selectedResidenceId = null;
              }
            }
            mutableAfter.navigation.selectedAmenityId = null;
          }

          return { ok: true, action, contextAfter: after };
        }

        case "open_inventory": {
          bridge.openInventory();
          mutableAfter.navigation.inventoryOpen = true;
          return { ok: true, action, contextAfter: after };
        }

        case "close_inventory": {
          bridge.closeInventory();
          mutableAfter.navigation.inventoryOpen = false;
          return { ok: true, action, contextAfter: after };
        }

        case "open_floor_plan": {
          const unitId = action.residenceId;
          const unit = before.inventory.residences.find((u) => u.id === unitId);
          if (!unit) {
            return {
              ok: false,
              code: "NOT_FOUND",
              message: `Residence ${unitId} not found`,
            };
          }

          let targetFacade = before.navigation.activeFacade;
          if (targetFacade === "front" && !frontHotspotIds.has(unitId) && rearHotspotIds.has(unitId)) {
            targetFacade = "rear";
          } else if (targetFacade === "rear" && !rearHotspotIds.has(unitId) && frontHotspotIds.has(unitId)) {
            targetFacade = "front";
          }

          const planViewMode = action.view ?? "color";
          bridge.openFloorPlan(unitId, planViewMode);

          mutableAfter.navigation.selectedResidenceId = unitId;
          mutableAfter.navigation.selectedAmenityId = null;
          mutableAfter.navigation.activeFacade = targetFacade;
          mutableAfter.navigation.inventoryOpen = false;
          mutableAfter.navigation.experienceModal = {
            isOpen: true,
            activeType: "plan",
            targetId: unitId,
            planView: planViewMode,
          };
          mutableAfter.project.mode = "exploring";

          return { ok: true, action, contextAfter: after };
        }

        case "close_floor_plan": {
          if (before.navigation.experienceModal.isOpen && before.navigation.experienceModal.activeType === "plan") {
            bridge.closeExperience();
            mutableAfter.navigation.experienceModal = {
              isOpen: false,
              activeType: null,
              targetId: null,
            };
          }
          return { ok: true, action, contextAfter: after };
        }

        case "set_plan_view": {
          if (!before.navigation.experienceModal.isOpen || before.navigation.experienceModal.activeType !== "plan") {
            return {
              ok: false,
              code: "PRECONDITION_FAILED",
              message: "Cannot change plan view when floor plan modal is not open",
            };
          }
          bridge.setPlanView?.(action.view);
          mutableAfter.navigation.experienceModal.planView = action.view;
          return { ok: true, action, contextAfter: after };
        }

        case "show_amenity": {
          const amenityId = action.amenityId;
          bridge.showAmenity(amenityId);

          mutableAfter.navigation.selectedResidenceId = null;
          mutableAfter.navigation.selectedAmenityId = amenityId;
          mutableAfter.navigation.inventoryOpen = false;
          mutableAfter.navigation.experienceModal = {
            isOpen: true,
            activeType: "amenity",
            targetId: amenityId,
          };
          mutableAfter.project.mode = "exploring";

          return { ok: true, action, contextAfter: after };
        }

        case "close_amenity": {
          if (before.navigation.experienceModal.isOpen && (before.navigation.experienceModal.activeType === "amenity" || before.navigation.selectedAmenityId)) {
            bridge.closeExperience();
            mutableAfter.navigation.selectedAmenityId = null;
            mutableAfter.navigation.experienceModal = {
              isOpen: false,
              activeType: null,
              targetId: null,
            };
          }
          return { ok: true, action, contextAfter: after };
        }

        case "open_tour": {
          const unitId = action.residenceId;
          const tour = virtualTours[unitId];
          if (!tour) {
            return {
              ok: false,
              code: "NOT_AVAILABLE",
              message: `Residence ${unitId} does not have an authorized 360 virtual tour`,
            };
          }

          bridge.openTour(unitId);

          mutableAfter.navigation.selectedResidenceId = unitId;
          mutableAfter.navigation.selectedAmenityId = null;
          mutableAfter.navigation.inventoryOpen = false;
          mutableAfter.navigation.experienceModal = {
            isOpen: true,
            activeType: "tour",
            targetId: unitId,
          };
          mutableAfter.project.mode = "exploring";

          return { ok: true, action, contextAfter: after };
        }

        case "close_tour": {
          if (before.navigation.experienceModal.isOpen && before.navigation.experienceModal.activeType === "tour") {
            bridge.closeExperience();
            mutableAfter.navigation.experienceModal = {
              isOpen: false,
              activeType: null,
              targetId: null,
            };
          }
          return { ok: true, action, contextAfter: after };
        }

        case "open_map": {
          bridge.openMap?.();
          mutableAfter.navigation.mapOpen = true;
          return { ok: true, action, contextAfter: after };
        }

        case "close_map": {
          bridge.closeMap?.();
          mutableAfter.navigation.mapOpen = false;
          return { ok: true, action, contextAfter: after };
        }

        case "open_general_plans": {
          const idx = action.index ?? 0;
          bridge.openGeneralPlans?.(idx);
          mutableAfter.navigation.generalPlans = {
            isOpen: true,
            activeIndex: idx,
            totalCount: generalPlans.length,
            currentLevelLabel: generalPlans[idx]?.label[before.project.language] ?? `Nivel ${idx}`,
          };
          return { ok: true, action, contextAfter: after };
        }

        case "set_general_plan_index": {
          const idx = action.index;
          if (!before.navigation.generalPlans.isOpen) {
            return {
              ok: false,
              code: "PRECONDITION_FAILED",
              message: "General plans modal is not open",
            };
          }
          bridge.setGeneralPlanIndex?.(idx);
          mutableAfter.navigation.generalPlans.activeIndex = idx;
          mutableAfter.navigation.generalPlans.currentLevelLabel =
            generalPlans[idx]?.label[before.project.language] ?? `Nivel ${idx}`;
          return { ok: true, action, contextAfter: after };
        }

        case "close_general_plans": {
          bridge.closeGeneralPlans?.();
          mutableAfter.navigation.generalPlans.isOpen = false;
          return { ok: true, action, contextAfter: after };
        }

        case "open_interior_gallery": {
          const unitId = action.residenceId;
          const unit = before.inventory.residences.find((u) => u.id === unitId);
          if (!unit) {
            return {
              ok: false,
              code: "NOT_FOUND",
              message: `Residence ${unitId} not found`,
            };
          }
          const idx = action.index ?? 0;
          bridge.openInteriorGallery?.(unitId, idx);
          mutableAfter.navigation.selectedResidenceId = unitId;
          mutableAfter.navigation.experienceModal = {
            isOpen: true,
            activeType: "interior",
            targetId: unitId,
            galleryIndex: idx,
          };
          return { ok: true, action, contextAfter: after };
        }

        case "set_gallery_index": {
          if (!before.navigation.experienceModal.isOpen) {
            return {
              ok: false,
              code: "PRECONDITION_FAILED",
              message: "Gallery modal is not open",
            };
          }
          bridge.setGalleryIndex?.(action.index);
          mutableAfter.navigation.experienceModal.galleryIndex = action.index;
          return { ok: true, action, contextAfter: after };
        }

        case "set_highlight": {
          const highlight: ActiveHighlight = {
            targetType: action.targetType,
            targetId: action.targetId,
            label: action.label,
            regionCoordinates: action.regionCoordinates,
          };
          bridge.setHighlight?.(highlight);
          mutableAfter.navigation.activeHighlight = highlight;
          return { ok: true, action, contextAfter: after };
        }

        case "clear_highlight": {
          bridge.clearHighlight?.();
          mutableAfter.navigation.activeHighlight = null;
          return { ok: true, action, contextAfter: after };
        }

        case "set_language": {
          bridge.setLanguage(action.language);
          mutableAfter.project.language = action.language;
          return { ok: true, action, contextAfter: after };
        }

        case "set_currency": {
          bridge.setCurrency(action.currency);
          mutableAfter.project.currency = action.currency;
          return { ok: true, action, contextAfter: after };
        }

        case "list_units": {
          let units = before.inventory.residences;
          if (action.beds !== undefined) {
            units = units.filter((u) => u.beds === action.beds);
          }
          if (action.status !== undefined) {
            units = units.filter((u) => u.status === action.status);
          }
          if (action.maxPriceUsd !== undefined) {
            units = units.filter((u) => u.priceUsd <= action.maxPriceUsd!);
          }
          if (action.minPriceUsd !== undefined) {
            units = units.filter((u) => u.priceUsd >= action.minPriceUsd!);
          }
          if (action.facade !== undefined) {
            units = units.filter((u) => u.facade === action.facade);
          }
          return { ok: true, action, contextAfter: after, data: units };
        }

        case "get_unit_details": {
          const unit = before.inventory.residences.find((u) => u.id === action.residenceId);
          if (!unit) {
            return {
              ok: false,
              code: "NOT_FOUND",
              message: `Residence ${action.residenceId} not found in inventory`,
            };
          }
          return { ok: true, action, contextAfter: after, data: unit };
        }

        case "get_project_information": {
          return {
            ok: true,
            action,
            contextAfter: after,
            data: {
              topic: action.topic,
              project: before.project,
              totalUnits: before.inventory.residences.length,
            },
          };
        }

        case "request_human_handoff": {
          return {
            ok: true,
            action,
            contextAfter: after,
            data: {
              requested: true,
              reason: action.reason,
              preferredChannel: action.preferredChannel ?? "whatsapp",
            },
          };
        }
      }
    },
  };
}
