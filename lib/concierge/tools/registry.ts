import type { ToolDescriptor } from "../contracts";

export const TOOL_DESCRIPTORS: readonly ToolDescriptor[] = [
  {
    name: "select_residence",
    description: "Selects a residence by its unit ID and centers the camera on its facade.",
    parameters: {
      type: "object",
      properties: {
        residenceId: {
          type: "string",
          description: "Unit ID to select (e.g. '201', '302', '401', 'PH1').",
          enum: [
            "201", "202", "203", "204",
            "301", "302", "303", "304",
            "401", "402", "403", "404",
            "501", "502", "PH1", "PH2",
          ],
        },
      },
      required: ["residenceId"],
    },
  },
  {
    name: "set_facade",
    description: "Switches the active building facade between front and rear.",
    parameters: {
      type: "object",
      properties: {
        facade: {
          type: "string",
          description: "Facade to show: 'front' (principal) or 'rear' (posterior).",
          enum: ["front", "rear"],
        },
      },
      required: ["facade"],
    },
  },
  {
    name: "open_inventory",
    description: "Opens the full inventory drawer showing all residences, statuses, and pricing.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "close_inventory",
    description: "Closes the inventory drawer.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "open_floor_plan",
    description: "Opens the architectural floor plan modal for a specific residence unit.",
    parameters: {
      type: "object",
      properties: {
        residenceId: {
          type: "string",
          description: "Unit ID whose floor plan should be displayed (e.g. '201', '401', 'PH1').",
          enum: [
            "201", "202", "203", "204",
            "301", "302", "303", "304",
            "401", "402", "403", "404",
            "501", "502", "PH1", "PH2",
          ],
        },
      },
      required: ["residenceId"],
    },
  },
  {
    name: "close_floor_plan",
    description: "Closes the floor plan modal if currently open.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "show_amenity",
    description: "Shows an amenity experience modal (Lobby or Rooftop).",
    parameters: {
      type: "object",
      properties: {
        amenityId: {
          type: "string",
          description: "Amenity identifier: 'lobby' or 'rooftop'.",
          enum: ["lobby", "rooftop"],
        },
      },
      required: ["amenityId"],
    },
  },
  {
    name: "open_tour",
    description: "Opens the 360-degree virtual tour for an eligible residence unit.",
    parameters: {
      type: "object",
      properties: {
        residenceId: {
          type: "string",
          description: "Unit ID with an available virtual tour (e.g. '201', '401', 'PH1').",
          enum: [
            "201", "202", "203", "204",
            "301", "302", "303", "304",
            "401", "402", "403", "404",
            "501", "502", "PH1", "PH2",
          ],
        },
      },
      required: ["residenceId"],
    },
  },
  {
    name: "set_language",
    description: "Changes the display language of the sales room.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Language code: 'es' (Spanish) or 'en' (English).",
          enum: ["es", "en"],
        },
      },
      required: ["language"],
    },
  },
  {
    name: "set_currency",
    description: "Changes the active currency for price display.",
    parameters: {
      type: "object",
      properties: {
        currency: {
          type: "string",
          description: "Currency code: 'MXN' (Mexican Pesos) or 'USD' (US Dollars).",
          enum: ["MXN", "USD"],
        },
      },
      required: ["currency"],
    },
  },
] as const;

export function getToolDescriptor(name: string): ToolDescriptor | undefined {
  return TOOL_DESCRIPTORS.find((tool) => tool.name === name);
}
