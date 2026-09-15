import type {
  AmenityId,
  Currency,
  Language,
  UnitId,
  ViewId,
} from "../../pilitas/types";
import { hotspots } from "../../pilitas/catalog";
import type {
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
  openFloorPlan(id: UnitId): void;
  closeExperience(): void;
  showAmenity(amenityId: AmenityId): void;
  openTour(id: UnitId): void;
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
  // Deep clone before modifications
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
              message: `Residence ${unitId} not found`,
            };
          }

          // Check if unit is visible in current facade; if not, switch facade
          let targetFacade = before.navigation.activeFacade;
          if (targetFacade === "front" && !frontHotspotIds.has(unitId) && rearHotspotIds.has(unitId)) {
            targetFacade = "rear";
          } else if (targetFacade === "rear" && !rearHotspotIds.has(unitId) && frontHotspotIds.has(unitId)) {
            targetFacade = "front";
          }

          bridge.selectResidence(unitId);

          // Compute deterministic contextAfter
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
            // Check if current selection is visible in target facade
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
          // If isSame, selection is preserved (idempotent)

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

          bridge.openFloorPlan(unitId);

          mutableAfter.navigation.selectedResidenceId = unitId;
          mutableAfter.navigation.selectedAmenityId = null;
          mutableAfter.navigation.activeFacade = targetFacade;
          mutableAfter.navigation.inventoryOpen = false;
          mutableAfter.navigation.experienceModal = {
            isOpen: true,
            activeType: "plan",
            targetId: unitId,
          };
          mutableAfter.project.mode = "exploring";

          return { ok: true, action, contextAfter: after };
        }

        case "close_floor_plan": {
          // Only close if currently in "plan" experience
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

        case "show_amenity": {
          const amenityId = action.amenityId;
          bridge.showAmenity(amenityId);

          let targetFacade = before.navigation.activeFacade;
          if (amenityId === "lobby") {
            targetFacade = "front"; // Lobby only exists on front
          }

          mutableAfter.navigation.selectedResidenceId = null;
          mutableAfter.navigation.selectedAmenityId = amenityId;
          mutableAfter.navigation.activeFacade = targetFacade;
          mutableAfter.navigation.inventoryOpen = false;
          mutableAfter.navigation.experienceModal = {
            isOpen: true,
            activeType: "amenity",
            targetId: amenityId,
          };
          mutableAfter.project.mode = "exploring";

          return { ok: true, action, contextAfter: after };
        }

        case "open_tour": {
          const unitId = action.residenceId;
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
      }
    },
  };
}
