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
          description: "Unit ID whose floor plan to open.",
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
    description: "Closes the floor plan modal.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "set_plan_view",
    description: "Switches the view mode of the active floor plan between color render, clean blueprint, and dimensioned measurements.",
    parameters: {
      type: "object",
      properties: {
        view: {
          type: "string",
          description: "Floor plan view mode.",
          enum: ["color", "clean", "dimensions"],
        },
      },
      required: ["view"],
    },
  },
  {
    name: "show_amenity",
    description: "Opens the gallery and experience view for a building amenity (lobby or rooftop).",
    parameters: {
      type: "object",
      properties: {
        amenityId: {
          type: "string",
          description: "Amenity to display.",
          enum: ["lobby", "rooftop"],
        },
      },
      required: ["amenityId"],
    },
  },
  {
    name: "close_amenity",
    description: "Closes the amenity experience view.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "open_tour",
    description: "Opens the 360° virtual Matterport tour for an authorized residence unit.",
    parameters: {
      type: "object",
      properties: {
        residenceId: {
          type: "string",
          description: "Unit ID with an authorized tour.",
          enum: [
            "201", "202", "204",
            "301", "302", "304",
            "401", "402", "404",
            "501", "PH1",
          ],
        },
      },
      required: ["residenceId"],
    },
  },
  {
    name: "close_tour",
    description: "Closes the 360° virtual tour modal.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "open_map",
    description: "Opens the geographical location map of the project in Puerto Vallarta.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "close_map",
    description: "Closes the geographical location map modal.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "open_general_plans",
    description: "Opens the general architectural building floor plans (Basement to Rooftop).",
    parameters: {
      type: "object",
      properties: {
        index: {
          type: "number",
          description: "Optional level index to open (0: Basement, 1: Ground Floor, 2-6: Levels 2-6, 7: Rooftop).",
        },
      },
      required: [],
    },
  },
  {
    name: "set_general_plan_index",
    description: "Switches the active level index of the general plans.",
    parameters: {
      type: "object",
      properties: {
        index: {
          type: "number",
          description: "Level index (0 to 7).",
        },
      },
      required: ["index"],
    },
  },
  {
    name: "close_general_plans",
    description: "Closes the general plans modal.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "open_interior_gallery",
    description: "Opens the interior rendering gallery for a residence.",
    parameters: {
      type: "object",
      properties: {
        residenceId: {
          type: "string",
          description: "Unit ID whose interior gallery to show.",
        },
      },
      required: ["residenceId"],
    },
  },
  {
    name: "set_gallery_index",
    description: "Changes the active photo index inside the open gallery.",
    parameters: {
      type: "object",
      properties: {
        index: {
          type: "number",
          description: "Zero-based photo index.",
        },
      },
      required: ["index"],
    },
  },
  {
    name: "set_highlight",
    description: "Highlights an element (residence, amenity, UI control, or plan region) on screen with a subtle glow or outline.",
    parameters: {
      type: "object",
      properties: {
        targetType: {
          type: "string",
          description: "Target element type.",
          enum: ["residence", "amenity", "control", "plan_region"],
        },
        targetId: {
          type: "string",
          description: "Identifier of the element to highlight.",
        },
        label: {
          type: "string",
          description: "Optional descriptive tooltip label.",
        },
      },
      required: ["targetType", "targetId"],
    },
  },
  {
    name: "clear_highlight",
    description: "Clears any active spotlight or visual highlight.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "set_language",
    description: "Switches the application language between Spanish ('es') and English ('en').",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Target language code.",
          enum: ["es", "en"],
        },
      },
      required: ["language"],
    },
  },
  {
    name: "set_currency",
    description: "Switches the active price currency between Mexican Pesos ('MXN') and US Dollars ('USD').",
    parameters: {
      type: "object",
      properties: {
        currency: {
          type: "string",
          description: "Target currency.",
          enum: ["MXN", "USD"],
        },
      },
      required: ["currency"],
    },
  },
];

export function getToolDescriptor(name: string): ToolDescriptor | undefined {
  return TOOL_DESCRIPTORS.find((t) => t.name === name);
}
