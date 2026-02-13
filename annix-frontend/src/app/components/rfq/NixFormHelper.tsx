"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobalSpecs, PipeItem } from "@/app/lib/hooks/useRfqForm";
import { log } from "@/app/lib/logger";
import {
  diagnoseAllItems,
  type ItemDiagnosticResult,
  type ItemIssue,
} from "@/app/lib/utils/itemDiagnostics";

interface Position {
  x: number;
  y: number;
}

export interface NixFormAction {
  type: "highlight" | "click" | "scroll" | "focus" | "point";
  elementId?: string;
  selector?: string;
  dataTarget?: string;
  message?: string;
}

interface NixFormHelperProps {
  isVisible: boolean;
  onClose: () => void;
  onReactivate: () => void;
  isMinimized: boolean;
  onAskQuestion?: (question: string) => Promise<string>;
  onFormAction?: (action: NixFormAction) => void;
  items?: PipeItem[];
  globalSpecs?: GlobalSpecs;
  diagnosticTargetItemId?: string | null;
  diagnosticIssues?: ItemIssue[];
  diagnosticDismissedIds?: string[];
  onStartDiagnostic?: (itemId: string, issues: ItemIssue[]) => void;
  onDismissDiagnostic?: (itemId: string) => void;
  onClearDiagnostic?: () => void;
  onApplyFix?: (itemId: string, field: string, value: string | number) => void;
}

interface HighlightOverlay {
  rect: DOMRect;
  message: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: NixFormAction[];
}

interface GuidanceStep {
  dataTarget: string;
  message: string;
  instruction: string;
}

interface GuidanceFlow {
  steps: GuidanceStep[];
  currentStep: number;
  name: string;
}

const FORM_KNOWLEDGE = {
  locations: {
    straightPipe: {
      button: 'Add Item button (blue) or the "Straight Pipe" card when starting fresh',
      description: "For standard pipeline sections",
    },
    bend: {
      button: 'Add Bend button (purple) or the "Bend Section" card when starting fresh',
      description: "For all bend types including standard bends, duckfoot bends, and sweep tees",
    },
    fitting: {
      button: 'Add Fitting button (green) or the "Fittings" card when starting fresh',
      description: "For tees, laterals, reducers, and other pipe fittings (NOT sweep tees)",
    },
    steelWork: {
      button: "Add Steel Work button (orange) - only shows if enabled for your quote",
      description: "For pipe supports and steelwork",
    },
  },
  bendTypes: {
    BEND: {
      name: "Standard Bend",
      location: 'Bends > Item Type dropdown > "Bend"',
      description: "Regular pipe bends at various angles (15°, 22.5°, 30°, 45°, 60°, 90°)",
    },
    SWEEP_TEE: {
      name: "Sweep Tee",
      location: 'Bends > Item Type dropdown > "Sweep Tee"',
      description:
        "A tee with a curved 90° branch connection. Found in BENDS section, not Fittings!",
    },
    DUCKFOOT_BEND: {
      name: "Duckfoot Bend",
      location: 'Bends > Item Type dropdown > "Duckfoot Bend"',
      description: "A 90° bend with integrated steelwork base plate for floor mounting",
    },
  },
  fittingTypes: {
    EQUAL_TEE: {
      name: "Equal Tee",
      location: 'Fittings > Fitting Type dropdown > "Equal Tee"',
      description: "T-junction with all three connections the same size",
    },
    UNEQUAL_TEE: {
      name: "Reducing/Unequal Tee",
      location: 'Fittings > Fitting Type dropdown > "Unequal Tee"',
      description: "T-junction with a smaller branch",
    },
    LATERAL: {
      name: "Lateral",
      location: 'Fittings > Fitting Type dropdown > "Lateral"',
      description: "45° angled branch connection",
    },
    CON_REDUCER: {
      name: "Concentric Reducer",
      location: 'Fittings > Fitting Type dropdown > "Con Reducer"',
      description: "Size reduction keeping centerline aligned",
    },
    ECCENTRIC_REDUCER: {
      name: "Eccentric Reducer",
      location: 'Fittings > Fitting Type dropdown > "Eccentric Reducer"',
      description: "Size reduction with offset (maintains bottom-of-pipe)",
    },
  },
  fields: {
    nominalBore: {
      label: "NB (Nominal Bore)",
      description: "The pipe size designation (e.g., 100NB, 200NB). Not the actual diameter.",
    },
    schedule: {
      label: "Schedule",
      description: "Wall thickness designation (Sch10, Sch40, Sch80). Higher = thicker walls.",
    },
    bendType: {
      label: "Bend Radius Type",
      description: "1.5D, 3D, 5D etc. Larger = gentler bend with better flow.",
    },
    bendDegrees: {
      label: "Bend Angle",
      description: "The angle of the bend: 15°, 22.5°, 30°, 45°, 60°, or 90°",
    },
    itemType: {
      label: "Item Type",
      description: "Select Bend, Duckfoot Bend, or Sweep Tee",
    },
  },
};

const STORAGE_KEY = "nix-form-helper-position";
const BOTTOM_TOOLBAR_HEIGHT = 72;
const Z_INDEX_AVATAR = 10001;
const Z_INDEX_DIALOG = 10002;
const Z_INDEX_CHAT = 10003;

const ITEM_TYPE_LABELS: Record<string, string> = {
  straight_pipe: "Straight Pipe",
  bend: "Bend",
  fitting: "Fitting",
  pipe_steel_work: "Steel Work",
  expansion_joint: "Expansion Joint",
  valve: "Valve",
  instrument: "Instrument",
  pump: "Pump",
};

const diagnosticResultsToGuidanceSteps = (issues: ItemIssue[]): GuidanceStep[] =>
  issues.map((issue, idx) => ({
    dataTarget: issue.dataTarget,
    message: `Issue ${idx + 1}: ${issue.message}`,
    instruction:
      issue.suggestedValue !== null
        ? `${issue.message}. Suggested value: ${issue.suggestedValue}`
        : issue.message,
  }));

interface QuickAction {
  label: string;
  query: string;
  icon: "pipe" | "bend" | "fitting" | "help" | "diagnose";
  category: "add" | "help" | "diagnose";
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Pipe", query: "How do I add a straight pipe?", icon: "pipe", category: "add" },
  { label: "Bend", query: "How do I add a bend?", icon: "bend", category: "add" },
  { label: "Duckfoot", query: "How do I add a duckfoot bend?", icon: "bend", category: "add" },
  { label: "Sweep Tee", query: "How do I add a sweep tee?", icon: "bend", category: "add" },
  { label: "Tee Fitting", query: "How do I add a tee fitting?", icon: "fitting", category: "add" },
  { label: "Reducer", query: "How do I add a reducer?", icon: "fitting", category: "add" },
  { label: "NB Help", query: "What NB should I select?", icon: "help", category: "help" },
  { label: "Schedule Help", query: "What schedule should I use?", icon: "help", category: "help" },
];

interface IntentMatch {
  intent: string;
  score: number;
}

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[''`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const INTENT_KEYWORDS: Record<string, string[]> = {
  sweep_tee: ["sweep tee", "sweeptee", "curved tee", "sweep branch"],
  duckfoot_bend: ["duckfoot", "duck foot", "ducks foot", "floor mount bend", "base plate bend"],
  standard_bend: ["bend", "elbow", "pipe bend"],
  tee_fitting: ["tee", "tee fitting", "t fitting", "t junction", "branch"],
  lateral: ["lateral", "45 degree branch", "angled branch"],
  reducer: ["reducer", "reducing", "concentric", "eccentric", "size change"],
  straight_pipe: ["pipe", "straight pipe", "straight", "pipeline"],
  fitting: ["fitting", "fittings"],
  steel_work: ["steel work", "steelwork", "support", "bracket", "saddle"],
  expansion_joint: ["expansion joint", "expansion", "bellows"],
  diagnose: ["fix", "diagnose", "check", "validate", "issues", "problems", "whats wrong", "errors"],
  nb_help: ["nb", "nominal bore", "pipe size", "what size"],
  schedule_help: ["schedule", "wall thickness", "sch"],
  angle_help: ["angle", "degrees", "bend angle"],
  radius_help: ["radius", "bend radius", "1.5d", "3d", "5d"],
};

const INTENT_EXCLUSIONS: Record<string, string[]> = {
  standard_bend: ["sweep", "duck", "s-bend", "sbend", "offset"],
  tee_fitting: ["sweep"],
};

const matchIntent = (query: string): IntentMatch | null => {
  const normalized = normalizeText(query);
  const words = normalized.split(" ");

  let bestMatch: IntentMatch | null = null;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const exclusions = INTENT_EXCLUSIONS[intent] || [];
    const isExcluded = exclusions.some((ex) => normalized.includes(normalizeText(ex)));
    if (isExcluded) continue;

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);

      if (normalized.includes(normalizedKeyword)) {
        const score =
          normalizedKeyword.length / normalized.length + normalizedKeyword.split(" ").length * 0.1;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { intent, score };
        }
      }

      const keywordWords = normalizedKeyword.split(" ");
      const matchedWords = keywordWords.filter((kw) =>
        words.some((w) => w.includes(kw) || kw.includes(w)),
      );
      if (matchedWords.length === keywordWords.length && matchedWords.length > 0) {
        const score = matchedWords.length / words.length + keywordWords.length * 0.15;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { intent, score };
        }
      }
    }
  }

  return bestMatch;
};

function generateFormGuidance(question: string): {
  response: string;
  actions: NixFormAction[];
  guidanceSteps?: GuidanceStep[];
} {
  const q = question.toLowerCase();
  const actions: NixFormAction[] = [];
  const intentMatch = matchIntent(question);
  const isAtTop = q.includes("at top");
  const buttonSuffix = isAtTop ? "-top" : "";
  const positionText = isAtTop ? " at the top of your list" : "";

  if (intentMatch?.intent === "sweep_tee") {
    return {
      response: `I'll guide you through creating a Sweep Tee${positionText} step by step. Follow along as I show you each field!

Sweep tees are in the BENDS section because they include a curved 90° branch connection. Steel spec, schedule, and flange settings are already set from page 2.`,
      actions: [
        {
          type: "point",
          dataTarget: `add-bend-button${buttonSuffix}`,
          message: "Step 1: Click Bend button",
        },
      ],
      guidanceSteps: [
        {
          dataTarget: `add-bend-button${buttonSuffix}`,
          message: "Step 1: Click Bend button",
          instruction: "Click the purple Bend button to add a new bend item.",
        },
        {
          dataTarget: "bend-item-type",
          message: 'Step 2: Select "Sweep Tee"',
          instruction: 'Click this dropdown and select "Sweep Tee" from the list.',
        },
        {
          dataTarget: "bend-nb-select",
          message: "Step 3: Select pipe size (NB)",
          instruction:
            "Choose your Nominal Bore (pipe size). Sweep tees are only available in sizes 200-900 NB.",
        },
        {
          dataTarget: "bend-style-select",
          message: "Step 4: Select Bend Style",
          instruction: "Choose Segmented or Pulled bend style. This affects manufacturing method.",
        },
        {
          dataTarget: "bend-radius-select",
          message: "Step 5: Select Bend Radius",
          instruction: "Choose the bend radius (Elbow, Medium, Long). Larger = gentler curve.",
        },
        {
          dataTarget: "bend-angle-select",
          message: "Step 6: Select Bend Angle",
          instruction: "Choose the angle for your sweep tee (typically 90°).",
        },
        {
          dataTarget: "bend-segments-select",
          message: "Step 7: Number of Segments",
          instruction:
            "For segmented style: choose the number of mitre segments. This affects welding requirements.",
        },
        {
          dataTarget: "bend-end-config-select",
          message: "Step 8: End Configuration",
          instruction:
            "Choose end type: PE (plain end), FOE (flanged one end), FBE (flanged both ends).",
        },
        {
          dataTarget: "bend-3d-preview",
          message: "Step 9: Review 3D Preview",
          instruction:
            "Check the 3D preview to make sure this looks correct. You can rotate the view to inspect from all angles!",
        },
      ],
    };
  }

  if (intentMatch?.intent === "duckfoot_bend") {
    return {
      response: `I'll guide you through creating a Duckfoot Bend${positionText} step by step!

Duckfoot bends include integrated steelwork base plate for floor mounting. The bend angle is fixed at 90°. Steel spec, schedule, and flange settings are already set from page 2.`,
      actions: [
        {
          type: "point",
          dataTarget: `add-bend-button${buttonSuffix}`,
          message: "Step 1: Click Bend button",
        },
      ],
      guidanceSteps: [
        {
          dataTarget: `add-bend-button${buttonSuffix}`,
          message: "Step 1: Click Bend button",
          instruction: "Click the purple Bend button to add a new bend item.",
        },
        {
          dataTarget: "bend-item-type",
          message: 'Step 2: Select "Duckfoot Bend"',
          instruction: 'Click this dropdown and select "Duckfoot Bend" from the list.',
        },
        {
          dataTarget: "bend-nb-select",
          message: "Step 3: Select pipe size (NB)",
          instruction:
            "Choose your Nominal Bore. Steelwork dimensions will auto-populate based on your selection.",
        },
        {
          dataTarget: "bend-style-select",
          message: "Step 4: Select Bend Style",
          instruction: "Choose Segmented or Pulled bend style.",
        },
        {
          dataTarget: "bend-radius-select",
          message: "Step 5: Select Bend Radius",
          instruction: "Choose the bend radius. The angle is fixed at 90° for duckfoot bends.",
        },
        {
          dataTarget: "bend-segments-select",
          message: "Step 6: Number of Segments",
          instruction:
            "For segmented style: choose the number of mitre segments. This affects welding requirements.",
        },
        {
          dataTarget: "bend-end-config-select",
          message: "Step 7: End Configuration",
          instruction: "Choose end type for the pipe end (the base has integrated steelwork).",
        },
        {
          dataTarget: "bend-3d-preview",
          message: "Step 8: Review 3D Preview",
          instruction:
            "Check the 3D preview showing the bend with its steelwork base plate. Make sure it looks correct!",
        },
      ],
    };
  }

  if ((q.includes("tee") || q.includes("branch")) && !q.includes("sweep")) {
    return {
      response: `For a standard Tee (perpendicular branch):

1. Click the green "Fitting" button (I'm pointing at it!)
2. In "Fitting Type" dropdown, select:
   - "Equal Tee" - all connections same size
   - "Unequal Tee" - smaller branch size
3. Set your NB and branch size if reducing

For a curved branch (Sweep Tee), use the Bends section instead.`,
      actions: [
        { type: "point", dataTarget: "add-fitting-button", message: "Click the Fitting button" },
      ],
    };
  }

  // STANDARD BEND - Full guidance (not sweep tee, not duckfoot) - skips global fields from page 2
  if (q.includes("bend") && !q.includes("sweep") && !q.includes("duck") && !q.includes("s-")) {
    // Check if asking about creating/adding a bend
    if (
      q.includes("add") ||
      q.includes("create") ||
      q.includes("make") ||
      q.includes("how do i") ||
      q.includes("how to")
    ) {
      return {
        response: `I'll guide you through creating a Standard Bend step by step!

You can choose between Pulled (SABS 62) or Segmented (SABS 719) bend styles. Steel spec, schedule, and flange settings are already set from page 2.`,
        actions: [
          { type: "point", dataTarget: "add-bend-button", message: "Step 1: Click Bend button" },
        ],
        guidanceSteps: [
          {
            dataTarget: "add-bend-button",
            message: "Step 1: Click Bend button",
            instruction: "Click the purple Bend button to add a new bend item.",
          },
          {
            dataTarget: "bend-item-type",
            message: 'Step 2: Keep "Bend" selected',
            instruction:
              'The Item Type should already be set to "Bend". Leave it as is for a standard bend.',
          },
          {
            dataTarget: "bend-nb-select",
            message: "Step 3: Select pipe size (NB)",
            instruction: "Choose your Nominal Bore (pipe size) for the bend.",
          },
          {
            dataTarget: "bend-style-select",
            message: "Step 4: Select Bend Style",
            instruction:
              'Choose "Pulled" (smooth, SABS 62) or "Segmented" (welded mitres, SABS 719).',
          },
          {
            dataTarget: "bend-radius-select",
            message: "Step 5: Select Bend Radius",
            instruction:
              "For Pulled: 1D, 1.5D, 2D, 3D, 5D. For Segmented: Elbow, Medium, Long radius.",
          },
          {
            dataTarget: "bend-segments-select",
            message: "Step 6: Number of Segments",
            instruction:
              "For segmented bends only: choose number of mitre segments (affects welding).",
          },
          {
            dataTarget: "bend-end-config-select",
            message: "Step 7: End Configuration",
            instruction:
              "Choose end type: PE (plain), FOE (flanged one end), FBE (flanged both ends).",
          },
          {
            dataTarget: "bend-3d-preview",
            message: "Step 8: Review 3D Preview",
            instruction:
              "Check the 3D preview to verify your bend configuration. Rotate to inspect all angles!",
          },
        ],
      };
    }

    if (q.includes("angle") || q.includes("degree") || q.includes("90") || q.includes("45")) {
      return {
        response: `To set a bend angle:

1. Add a bend using the purple "Bend" button
2. Find the "Bend Angle" dropdown in Row 2 of the form
3. Select your angle: 15°, 22.5°, 30°, 45°, 60°, or 90°

The angle options depend on your selected bend radius type and NB.`,
        actions: [],
      };
    }

    if (q.includes("radius") || q.includes("1.5d") || q.includes("3d") || q.includes("5d")) {
      return {
        response: `To set bend radius:

1. Add a bend using the purple "Bend" button
2. Find the "Bend Radius" dropdown in Row 1
3. Select your radius:
   - For Pulled bends: 1D (tight), 1.5D, 2D, 3D, 5D (long radius)
   - For Segmented bends: Elbow, Medium, Long

Larger radius = smoother flow but needs more space.`,
        actions: [],
      };
    }

    return {
      response:
        "Standard bends are regular pipe bends at various angles. Let me guide you through creating one!",
      actions: [
        { type: "point", dataTarget: "add-bend-button", message: "Step 1: Click Bend button" },
      ],
      guidanceSteps: [
        {
          dataTarget: "add-bend-button",
          message: "Step 1: Click Bend button",
          instruction: "Click the purple Bend button to start.",
        },
        {
          dataTarget: "bend-nb-select",
          message: "Step 2: Select NB",
          instruction: "Choose your pipe size (Nominal Bore).",
        },
        {
          dataTarget: "bend-style-select",
          message: "Step 3: Select Style",
          instruction: "Choose Pulled or Segmented bend style.",
        },
        {
          dataTarget: "bend-radius-select",
          message: "Step 4: Select Radius",
          instruction: "Choose the bend radius type.",
        },
        {
          dataTarget: "bend-angle-select",
          message: "Step 5: Select Angle",
          instruction: "Choose the bend angle (15°, 22.5°, 30°, 45°, 60°, or 90°).",
        },
        {
          dataTarget: "bend-segments-select",
          message: "Step 6: Number of Segments",
          instruction: "For segmented style: choose the number of mitre segments.",
        },
        {
          dataTarget: "bend-end-config-select",
          message: "Step 7: End Configuration",
          instruction: "Choose end type: PE, FOE, or FBE.",
        },
        {
          dataTarget: "bend-3d-preview",
          message: "Step 8: Review",
          instruction: "Check the 3D preview!",
        },
      ],
    };
  }

  // STRAIGHT PIPE - Full guidance (skips global fields from page 2: steel spec, schedule, flange settings)
  if (
    q.includes("straight") ||
    (q.includes("pipe") && !q.includes("bend") && !q.includes("fitting"))
  ) {
    // Check if asking about creating/adding a pipe
    if (
      q.includes("add") ||
      q.includes("create") ||
      q.includes("make") ||
      q.includes("how do i") ||
      q.includes("how to")
    ) {
      return {
        response: `I'll guide you through creating a Straight Pipe step by step!

Straight pipes are the basic pipeline sections that connect everything together. Steel spec, schedule, and flange settings are already set from page 2.`,
        actions: [
          { type: "point", dataTarget: "add-pipe-button", message: "Step 1: Click Pipe button" },
        ],
        guidanceSteps: [
          {
            dataTarget: "add-pipe-button",
            message: "Step 1: Click Pipe button",
            instruction: 'Click the blue "Pipe" button to add a new straight pipe.',
          },
          {
            dataTarget: "pipe-nb-select",
            message: "Step 2: Select pipe size (NB)",
            instruction:
              "Choose your Nominal Bore (pipe size). Common sizes: 50, 80, 100, 150, 200 NB.",
          },
          {
            dataTarget: "pipe-length-input",
            message: "Step 3: Enter Pipe Length",
            instruction:
              "Enter the individual pipe length in meters. Common lengths: 6m, 12m. Or click a preset button.",
          },
          {
            dataTarget: "pipe-end-config-select",
            message: "Step 4: End Configuration",
            instruction:
              "Choose end type: PE (plain end for welding), FOE (flanged one end), FBE (flanged both ends).",
          },
          {
            dataTarget: "pipe-3d-preview",
            message: "Step 5: Review 3D Preview",
            instruction:
              "Check the 3D preview to verify your pipe configuration. The preview shows flanges if selected!",
          },
        ],
      };
    }

    return {
      response: "Straight pipes are standard pipeline sections. Let me guide you!",
      actions: [
        { type: "point", dataTarget: "add-pipe-button", message: "Step 1: Click Pipe button" },
      ],
      guidanceSteps: [
        {
          dataTarget: "add-pipe-button",
          message: "Step 1: Click Pipe button",
          instruction: "Click the blue Pipe button to add a pipe.",
        },
        {
          dataTarget: "pipe-nb-select",
          message: "Step 2: Select NB",
          instruction: "Choose your pipe size.",
        },
        {
          dataTarget: "pipe-length-input",
          message: "Step 3: Set Length",
          instruction: "Enter the pipe length in meters.",
        },
        {
          dataTarget: "pipe-end-config-select",
          message: "Step 4: End Config",
          instruction: "Choose plain end or flanged.",
        },
        {
          dataTarget: "pipe-3d-preview",
          message: "Step 5: Review",
          instruction: "Check the 3D preview!",
        },
      ],
    };
  }

  if (q.includes("reducer") || q.includes("reducing")) {
    return {
      response: `To add a reducer:

1. Click the green "Fitting" button (I'm pointing at it!)
2. In "Fitting Type" select:
   - "Con Reducer" - centerline stays aligned (horizontal runs)
   - "Eccentric Reducer" - bottom stays flat (drainage/pumps)
3. Select the larger NB first, then the smaller NB

The reducer connects two different pipe sizes.`,
      actions: [
        { type: "point", dataTarget: "add-fitting-button", message: "Click the Fitting button" },
      ],
    };
  }

  if (q.includes("lateral") || q.includes("45")) {
    return {
      response: `To add a lateral (45° branch):

1. Click the green "Fitting" button (I'm pointing at it!)
2. Select "Lateral" from the Fitting Type dropdown
3. Set your NB values

Laterals provide a 45° angled branch connection.`,
      actions: [
        { type: "point", dataTarget: "add-fitting-button", message: "Click the Fitting button" },
      ],
    };
  }

  if (q.includes("flange") && (q.includes("type") || q.includes("add") || q.includes("how"))) {
    return {
      response: `Flanges are added via the end configuration:

1. On your pipe or bend item, find "End Configuration"
2. Select a flanged option:
   - "FF" = Flanged both ends
   - "FPE" = Flanged one end, plain other
   - "FBF" = Flanged + blank flange (cap)
3. Select flange standard (ANSI, SABS) and pressure class

Flange weights calculate automatically based on NB and class.`,
      actions: [],
    };
  }

  if (
    q.includes("nb") ||
    q.includes("nominal bore") ||
    q.includes("size") ||
    q.includes("diameter")
  ) {
    return {
      response: `NB (Nominal Bore) is the pipe size selection:

1. Find the "NB" dropdown on your item
2. Select from standard sizes: 15, 20, 25, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300... up to 900NB
3. The actual OD (outside diameter) differs - NB is a reference size

Example: 100NB pipe has OD of 114.3mm`,
      actions: [],
    };
  }

  if (q.includes("schedule") || q.includes("wall") || q.includes("thickness")) {
    return {
      response: `Schedule sets the wall thickness:

1. Find the "Schedule" dropdown on your item
2. Common options:
   - Sch10 = thin wall, low pressure
   - Sch40 = standard wall, general purpose
   - Sch80 = thick wall, high pressure
   - Sch160/XXS = extra heavy

Higher schedule = thicker walls = more weight.`,
      actions: [],
    };
  }

  if (q.includes("quantity") || q.includes("how many") || q.includes("multiple")) {
    return {
      response: `To set quantity:

1. Find the "Qty" field on your item
2. Enter the number of identical items
3. Total weight will calculate automatically

Each line item can have multiple identical pieces.`,
      actions: [],
    };
  }

  if (q.includes("delete") || q.includes("remove")) {
    return {
      response: `To remove an item:

Look for the red trash/delete icon on the right side of the item card and click it.

This removes the item from your RFQ.`,
      actions: [],
    };
  }

  if (q.includes("copy") || q.includes("duplicate")) {
    return {
      response: `To duplicate an item:

Look for the copy/duplicate icon on the item card. This creates a copy with all the same specs that you can then modify.`,
      actions: [],
    };
  }

  if (q.includes("help") || q.includes("what can") || q.includes("how do i")) {
    return {
      response: `I can help you fill out this RFQ form! Ask me:

• "How do I add a sweep tee?" - I'll guide you step by step
• "Where is the bend angle?" - I'll tell you which dropdown
• "What's the difference between..." - I'll explain options

Just describe what you're trying to do and I'll show you exactly where to click!`,
      actions: [],
    };
  }

  return {
    response: `I can help you with this RFQ form. Try asking:

• "How do I make a sweep tee?"
• "Where do I add a duckfoot bend?"
• "How do I add a tee fitting?"
• "What NB should I select?"
• "How do I set the bend angle?"

Tell me what you're trying to add and I'll guide you to the right place!`,
    actions: [],
  };
}

export default function NixFormHelper({
  isVisible,
  onClose,
  onReactivate,
  isMinimized,
  onAskQuestion,
  onFormAction,
  items = [],
  globalSpecs,
  diagnosticTargetItemId = null,
  diagnosticIssues = [],
  diagnosticDismissedIds = [],
  onStartDiagnostic,
  onDismissDiagnostic,
  onClearDiagnostic,
  onApplyFix,
}: NixFormHelperProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showHoverDialog, setShowHoverDialog] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const [highlightOverlay, setHighlightOverlay] = useState<HighlightOverlay | null>(null);
  const [isPointingAt, setIsPointingAt] = useState<Position | null>(null);
  const [savedPosition, setSavedPosition] = useState<Position | null>(null);
  const [guidanceFlow, setGuidanceFlow] = useState<GuidanceFlow | null>(null);
  const [currentInstruction, setCurrentInstruction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ query: string; itemType: string } | null>(
    null,
  );
  const avatarRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetClickHandlerRef = useRef<(() => void) | null>(null);
  const targetChangeHandlerRef = useRef<(() => void) | null>(null);
  const currentTargetRef = useRef<Element | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const waitingForElementRef = useRef<NodeJS.Timeout | null>(null);
  const waitingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAdvancedRef = useRef<boolean>(false);
  const pendingStepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStepIndexRef = useRef<number>(-1);
  const [diagnosticFixStepIndex, setDiagnosticFixStepIndex] = useState<number>(0);

  const itemDiagnosticResults = useMemo(
    () => (items.length > 0 ? diagnoseAllItems(items, globalSpecs) : []),
    [items, globalSpecs],
  );

  const unacknowledgedDiagnostics = useMemo(
    () => itemDiagnosticResults.filter((r) => !diagnosticDismissedIds.includes(r.itemId)),
    [itemDiagnosticResults, diagnosticDismissedIds],
  );

  const diagnosticBadgeCount = unacknowledgedDiagnostics.length;

  const currentDiagnosticResult = useMemo(
    () =>
      diagnosticTargetItemId !== null
        ? (itemDiagnosticResults.find((r) => r.itemId === diagnosticTargetItemId) ?? null)
        : null,
    [diagnosticTargetItemId, itemDiagnosticResults],
  );

  const endGuidance = useCallback(() => {
    setHighlightOverlay(null);
    setIsPointingAt(null);
    setGuidanceFlow(null);
    setCurrentInstruction(null);
    currentStepIndexRef.current = -1;
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (currentTargetRef.current) {
      if (targetClickHandlerRef.current) {
        currentTargetRef.current.removeEventListener("click", targetClickHandlerRef.current);
        targetClickHandlerRef.current = null;
      }
      if (targetChangeHandlerRef.current) {
        currentTargetRef.current.removeEventListener("change", targetChangeHandlerRef.current);
        targetChangeHandlerRef.current = null;
      }
      currentTargetRef.current = null;
    }
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
      mutationObserverRef.current = null;
    }
    if (savedPosition) {
      setPosition(savedPosition);
      setSavedPosition(null);
    }
  }, [savedPosition]);

  const pointAtElement = useCallback(
    (dataTarget: string, message: string, instruction?: string) => {
      log.debug(`[Nix Debug] pointAtElement called for "${dataTarget}"`);

      // Reset advance guard for this new step
      hasAdvancedRef.current = false;

      // Cancel any pending step timeout (prevents duplicate calls)
      if (pendingStepTimeoutRef.current) {
        clearTimeout(pendingStepTimeoutRef.current);
        pendingStepTimeoutRef.current = null;
      }

      // Clean up any pending waits from previous calls
      if (waitingForElementRef.current) {
        clearTimeout(waitingForElementRef.current);
        waitingForElementRef.current = null;
      }
      if (waitingIntervalRef.current) {
        clearInterval(waitingIntervalRef.current);
        waitingIntervalRef.current = null;
      }
      if (currentTargetRef.current) {
        if (targetClickHandlerRef.current) {
          currentTargetRef.current.removeEventListener("click", targetClickHandlerRef.current);
          targetClickHandlerRef.current = null;
        }
        if (targetChangeHandlerRef.current) {
          currentTargetRef.current.removeEventListener("change", targetChangeHandlerRef.current);
          targetChangeHandlerRef.current = null;
        }
        currentTargetRef.current = null;
      }
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
        mutationObserverRef.current = null;
      }

      const allElements = document.querySelectorAll(`[data-nix-target="${dataTarget}"]`);
      const elements = Array.from(allElements).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      log.debug(
        `[Nix Debug] Found ${allElements.length} elements for target "${dataTarget}", ${elements.length} visible`,
      );
      elements.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const tagName = el.tagName;
        const isDisabled = (el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement)
          .disabled;
        log.debug(
          `[Nix Debug]   Element ${i}: tag=${tagName}, disabled=${isDisabled}, top=${rect.top.toFixed(0)}, left=${rect.left.toFixed(0)}, width=${rect.width.toFixed(0)}, height=${rect.height.toFixed(0)}, text="${el.textContent?.slice(0, 50)}"`,
        );
      });
      // For add buttons (not sections), use FIRST element; for form fields (multiple entries), use LAST element
      const useFirstElement = dataTarget.startsWith("add-") && dataTarget !== "add-item-section";

      // Prioritize SELECT elements over disabled inputs (important for segments dropdown)
      const selectElements = elements.filter((el) => el.tagName === "SELECT");
      const enabledElements = elements.filter(
        (el) => !(el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled,
      );
      const preferredElements =
        selectElements.length > 0
          ? selectElements
          : enabledElements.length > 0
            ? enabledElements
            : elements;

      const element =
        preferredElements.length > 0
          ? useFirstElement
            ? preferredElements[0]
            : preferredElements[preferredElements.length - 1]
          : null;

      if (!element) {
        if (dataTarget === "bend-segments-select") {
          log.debug("[Nix Debug] Segments element not found yet, waiting for it to appear...");
          const stepIndexWhenStarted = currentStepIndexRef.current;
          waitingIntervalRef.current = setInterval(() => {
            if (currentStepIndexRef.current !== stepIndexWhenStarted) {
              log.debug(
                `[Nix Debug] Segments wait interval cancelled - step changed from ${stepIndexWhenStarted} to ${currentStepIndexRef.current}`,
              );
              if (waitingIntervalRef.current) {
                clearInterval(waitingIntervalRef.current);
                waitingIntervalRef.current = null;
              }
              return;
            }
            const segmentElements = document.querySelectorAll(`[data-nix-target="${dataTarget}"]`);
            const visibleSegmentElements = Array.from(segmentElements).filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
            const segmentSelect = visibleSegmentElements.find(
              (el) => el.tagName === "SELECT",
            ) as HTMLElement;
            if (segmentSelect) {
              if (waitingIntervalRef.current) {
                clearInterval(waitingIntervalRef.current);
                waitingIntervalRef.current = null;
              }
              log.debug("[Nix Debug] Segments SELECT element appeared, pointing at it");
              pointAtElement(dataTarget, message, instruction);
            }
          }, 500);
          waitingForElementRef.current = setTimeout(() => {
            if (waitingIntervalRef.current) {
              clearInterval(waitingIntervalRef.current);
              waitingIntervalRef.current = null;
            }
            if (currentStepIndexRef.current !== stepIndexWhenStarted) {
              log.debug("[Nix Debug] Segments timeout cancelled - step already changed");
              return;
            }
            log.debug("[Nix Debug] Timeout waiting for segments element, advancing");
            setGuidanceFlow((prev) => {
              if (prev && prev.currentStep < prev.steps.length - 1) {
                const nextStep = prev.currentStep + 1;
                currentStepIndexRef.current = nextStep;
                setTimeout(() => {
                  const step = prev.steps[nextStep];
                  pointAtElement(step.dataTarget, step.message, step.instruction);
                }, 500);
                return { ...prev, currentStep: nextStep };
              }
              return prev;
            });
          }, 20000);
          return;
        }

        const fallbackSelectors: Record<string, string> = {
          "add-bend-button": 'button:has(span:contains("Bend"))',
          "add-fitting-button": 'button:has(span:contains("Fitting"))',
          "add-pipe-button": 'button:has(span:contains("Item"))',
          "add-item-section": '.border-dashed:has(span:contains("Add another item"))',
        };
        const fallbackSelector = fallbackSelectors[dataTarget];
        const fallback = fallbackSelector ? document.querySelector(fallbackSelector) : null;
        if (!fallback) {
          log.debug(
            `[Nix Debug] Element not found for target "${dataTarget}", skipping to next step`,
          );
          setGuidanceFlow((prev) => {
            if (prev && prev.currentStep < prev.steps.length - 1) {
              const nextStep = prev.currentStep + 1;
              currentStepIndexRef.current = nextStep;
              if (pendingStepTimeoutRef.current) {
                clearTimeout(pendingStepTimeoutRef.current);
              }
              pendingStepTimeoutRef.current = setTimeout(() => {
                pendingStepTimeoutRef.current = null;
                const step = prev.steps[nextStep];
                pointAtElement(step.dataTarget, step.message, step.instruction);
              }, 500);
              return { ...prev, currentStep: nextStep };
            }
            return prev;
          });
          return;
        }
      }

      const targetElement = element || document.querySelector(`[data-nix-target="${dataTarget}"]`);
      if (!targetElement) return;

      const is3DPreview = dataTarget.includes("3d-preview");
      targetElement.scrollIntoView({
        behavior: "instant",
        block: is3DPreview ? "start" : "center",
      });
      if (is3DPreview) {
        window.scrollBy({ top: -100, behavior: "instant" });
      }

      setTimeout(
        () => {
          const allFreshElements = document.querySelectorAll(`[data-nix-target="${dataTarget}"]`);
          const visibleFreshElements = Array.from(allFreshElements).filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          // Prioritize SELECT elements over disabled inputs (important for segments dropdown)
          const freshSelectElements = visibleFreshElements.filter((el) => el.tagName === "SELECT");
          const freshEnabledElements = visibleFreshElements.filter(
            (el) => !(el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled,
          );
          const freshPreferredElements =
            freshSelectElements.length > 0
              ? freshSelectElements
              : freshEnabledElements.length > 0
                ? freshEnabledElements
                : visibleFreshElements;

          const freshElement = (
            freshPreferredElements.length > 0
              ? useFirstElement
                ? freshPreferredElements[0]
                : freshPreferredElements[freshPreferredElements.length - 1]
              : null
          ) as HTMLElement;
          if (!freshElement) {
            log.debug(
              `[Nix Debug] Element "${dataTarget}" not found after scroll (${allFreshElements.length} total, ${visibleFreshElements.length} visible)`,
            );
            return;
          }
          const updatedRect = freshElement.getBoundingClientRect();
          log.debug(
            `[Nix Debug] After scroll - target="${dataTarget}", using ${useFirstElement ? "FIRST" : "LAST"} of ${freshPreferredElements.length} preferred elements (${freshSelectElements.length} SELECTs, ${freshEnabledElements.length} enabled)`,
          );
          log.debug(
            `[Nix Debug] Selected element: tag=${freshElement.tagName}, disabled=${(freshElement as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled}`,
          );
          log.debug(
            `[Nix Debug] Rect: top=${updatedRect.top.toFixed(0)}, left=${updatedRect.left.toFixed(0)}, width=${updatedRect.width.toFixed(0)}, height=${updatedRect.height.toFixed(0)}`,
          );
          log.debug(`[Nix Debug] Element text: "${freshElement.textContent?.slice(0, 50)}"`);
          log.debug(
            `[Nix Debug] Viewport: innerHeight=${window.innerHeight}, scrollY=${window.scrollY.toFixed(0)}`,
          );

          setShowChatWindow(false);
          setHighlightOverlay({ rect: updatedRect, message });
          if (instruction) {
            setCurrentInstruction(instruction);
          }

          if (position && !savedPosition) {
            setSavedPosition(position);
          }

          const targetX = updatedRect.left - 80;
          const targetY = updatedRect.top + updatedRect.height / 2 - 32;

          setIsPointingAt({
            x: Math.max(10, Math.min(window.innerWidth - 100, targetX)),
            y: Math.max(10, Math.min(window.innerHeight - BOTTOM_TOOLBAR_HEIGHT - 100, targetY)),
          });

          currentTargetRef.current = freshElement;

          const advanceToNextStep = () => {
            // Prevent double-firing
            if (hasAdvancedRef.current) {
              log.debug("[Nix Debug] advanceToNextStep called but already advanced, ignoring");
              return;
            }
            hasAdvancedRef.current = true;

            // Clean up listeners
            if (waitingIntervalRef.current) {
              clearInterval(waitingIntervalRef.current);
              waitingIntervalRef.current = null;
            }
            if (targetClickHandlerRef.current) {
              freshElement.removeEventListener("click", targetClickHandlerRef.current);
              targetClickHandlerRef.current = null;
            }
            if (targetChangeHandlerRef.current) {
              freshElement.removeEventListener("change", targetChangeHandlerRef.current);
              targetChangeHandlerRef.current = null;
            }
            if (mutationObserverRef.current) {
              mutationObserverRef.current.disconnect();
              mutationObserverRef.current = null;
            }
            currentTargetRef.current = null;

            // Cancel any pending step timeout before scheduling new one
            if (pendingStepTimeoutRef.current) {
              clearTimeout(pendingStepTimeoutRef.current);
              pendingStepTimeoutRef.current = null;
            }

            // Get current guidance flow state to calculate next step
            let nextStepInfo: {
              dataTarget: string;
              message: string;
              instruction: string;
              delayMs: number;
            } | null = null;

            setGuidanceFlow((prev) => {
              if (prev && prev.currentStep < prev.steps.length - 1) {
                const nextStep = prev.currentStep + 1;
                const step = prev.steps[nextStep];
                const delayMs = step.dataTarget === "bend-segments-select" ? 5000 : 1800;
                log.debug(
                  `[Nix Debug] Advancing from step ${prev.currentStep} to step ${nextStep} (${step.dataTarget})`,
                );
                currentStepIndexRef.current = nextStep;
                nextStepInfo = {
                  dataTarget: step.dataTarget,
                  message: step.message,
                  instruction: step.instruction,
                  delayMs,
                };
                return { ...prev, currentStep: nextStep };
              }
              endGuidance();
              return null;
            });

            // Schedule the next step OUTSIDE of state updater
            if (nextStepInfo) {
              const {
                dataTarget: nextTarget,
                message: nextMessage,
                instruction: nextInstruction,
                delayMs,
              } = nextStepInfo;
              pendingStepTimeoutRef.current = setTimeout(() => {
                pendingStepTimeoutRef.current = null;
                pointAtElement(nextTarget, nextMessage, nextInstruction);
              }, delayMs);
            }
          };

          const isSelectElement = freshElement.tagName === "SELECT";
          const isCombobox = freshElement.getAttribute("role") === "combobox";
          const isDisabled = (
            freshElement as HTMLInputElement | HTMLSelectElement | HTMLButtonElement
          ).disabled;

          // Special handling for segments field - MUST wait for actual SELECT element
          if (dataTarget === "bend-segments-select" && !isSelectElement) {
            log.debug(
              `[Nix Debug] Segments field found but not a SELECT (tag=${freshElement.tagName}, disabled=${isDisabled}), waiting for SELECT to appear`,
            );
            const stepIndexWhenStarted = currentStepIndexRef.current;
            waitingIntervalRef.current = setInterval(() => {
              if (currentStepIndexRef.current !== stepIndexWhenStarted) {
                log.debug("[Nix Debug] Segments wait cancelled - step changed");
                if (waitingIntervalRef.current) {
                  clearInterval(waitingIntervalRef.current);
                  waitingIntervalRef.current = null;
                }
                return;
              }
              const allWaitElements = document.querySelectorAll(
                `[data-nix-target="${dataTarget}"]`,
              );
              const selectElement = Array.from(allWaitElements).find((el) => {
                const rect = el.getBoundingClientRect();
                return el.tagName === "SELECT" && rect.width > 0 && rect.height > 0;
              }) as HTMLElement;
              if (selectElement) {
                if (waitingIntervalRef.current) {
                  clearInterval(waitingIntervalRef.current);
                  waitingIntervalRef.current = null;
                }
                log.debug("[Nix Debug] Segments SELECT element found, re-pointing");
                pointAtElement(dataTarget, message, instruction);
              }
            }, 500);
            // No auto-advance timeout - wait for user interaction only
            return;
          }

          if (
            isDisabled &&
            dataTarget !== "bend-segments-select" &&
            dataTarget !== "bend-end-config-select"
          ) {
            const elementText =
              freshElement.textContent?.trim() || (freshElement as HTMLInputElement).value || "";
            const isWaitingForInput =
              elementText.toLowerCase().includes("select") && !elementText.includes("(fixed)");
            if (isWaitingForInput) {
              log.debug(
                `[Nix Debug] Element "${dataTarget}" is disabled but waiting for prior input ("${elementText}"), waiting for element to become enabled`,
              );
              const stepIndexWhenStarted = currentStepIndexRef.current;
              const waitForEnabled = setInterval(() => {
                if (currentStepIndexRef.current !== stepIndexWhenStarted) {
                  log.debug("[Nix Debug] Wait for enabled cancelled - step changed");
                  clearInterval(waitForEnabled);
                  return;
                }
                const allWaitElements = document.querySelectorAll(
                  `[data-nix-target="${dataTarget}"]`,
                );
                const visibleWaitElements = Array.from(allWaitElements).filter((el) => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                });
                // Prioritize SELECT elements
                const waitSelectElements = visibleWaitElements.filter(
                  (el) => el.tagName === "SELECT",
                );
                const waitEnabledElements = visibleWaitElements.filter(
                  (el) =>
                    !(el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled,
                );
                const waitPreferredElements =
                  waitSelectElements.length > 0
                    ? waitSelectElements
                    : waitEnabledElements.length > 0
                      ? waitEnabledElements
                      : visibleWaitElements;
                const waitElement = (
                  waitPreferredElements.length > 0
                    ? useFirstElement
                      ? waitPreferredElements[0]
                      : waitPreferredElements[waitPreferredElements.length - 1]
                    : null
                ) as HTMLElement;
                if (waitElement) {
                  const isNowSelect = waitElement.tagName === "SELECT";
                  const waitDisabled = (
                    waitElement as HTMLInputElement | HTMLSelectElement | HTMLButtonElement
                  ).disabled;
                  if (isNowSelect || !waitDisabled) {
                    clearInterval(waitForEnabled);
                    log.debug(
                      `[Nix Debug] Element "${dataTarget}" is now ready (SELECT=${isNowSelect}, disabled=${waitDisabled}), re-pointing`,
                    );
                    pointAtElement(dataTarget, message, instruction);
                  }
                }
              }, 500);
              setTimeout(() => {
                clearInterval(waitForEnabled);
              }, 30000);
              return;
            }
            log.debug(
              `[Nix Debug] Element "${dataTarget}" is disabled and auto-filled ("${elementText}"), auto-advancing after brief pause`,
            );
            setTimeout(advanceToNextStep, 1500);
            return;
          }

          // For segments or end-config field, if disabled, wait for it to become enabled
          if (
            isDisabled &&
            (dataTarget === "bend-segments-select" || dataTarget === "bend-end-config-select")
          ) {
            log.debug(`[Nix Debug] ${dataTarget} is disabled, waiting for it to become enabled...`);
            const stepIndexWhenStarted = currentStepIndexRef.current;
            waitingIntervalRef.current = setInterval(() => {
              if (currentStepIndexRef.current !== stepIndexWhenStarted) {
                log.debug(`[Nix Debug] ${dataTarget} wait cancelled - step changed`);
                if (waitingIntervalRef.current) {
                  clearInterval(waitingIntervalRef.current);
                  waitingIntervalRef.current = null;
                }
                return;
              }
              const elements = document.querySelectorAll(`[data-nix-target="${dataTarget}"]`);
              const enabledEl = Array.from(elements).find((el) => {
                const rect = el.getBoundingClientRect();
                return (
                  el.tagName === "SELECT" &&
                  rect.width > 0 &&
                  rect.height > 0 &&
                  !(el as HTMLSelectElement).disabled
                );
              });
              if (enabledEl) {
                if (waitingIntervalRef.current) {
                  clearInterval(waitingIntervalRef.current);
                  waitingIntervalRef.current = null;
                }
                log.debug(`[Nix Debug] ${dataTarget} is now enabled, re-pointing`);
                pointAtElement(dataTarget, message, instruction);
              }
            }, 500);
            waitingForElementRef.current = setTimeout(() => {
              if (waitingIntervalRef.current) {
                clearInterval(waitingIntervalRef.current);
                waitingIntervalRef.current = null;
              }
            }, 30000);
            return;
          }

          if (isSelectElement) {
            const selectEl = freshElement as HTMLSelectElement;
            const initialValue = selectEl.value;
            const initialSelectedIndex = selectEl.selectedIndex;
            log.debug(
              `[Nix Debug] SELECT "${dataTarget}" - initial value: "${initialValue}", index: ${initialSelectedIndex}`,
            );

            // Use both change event AND polling to detect user selection
            const checkForChange = () => {
              const currentValue = selectEl.value;
              const currentIndex = selectEl.selectedIndex;
              if (
                currentValue !== initialValue ||
                (currentIndex !== initialSelectedIndex && currentIndex > 0)
              ) {
                log.debug(
                  `[Nix Debug] SELECT "${dataTarget}" - user selected: "${currentValue}" (was: "${initialValue}")`,
                );
                return true;
              }
              return false;
            };

            // Native change event handler
            const handleChange = () => {
              if (checkForChange()) {
                log.debug(`[Nix Debug] SELECT "${dataTarget}" - change event fired, advancing`);
                advanceToNextStep();
              }
            };
            freshElement.addEventListener("change", handleChange);
            targetChangeHandlerRef.current = handleChange;

            // Also poll for changes in case change event doesn't fire (React controlled components)
            const pollInterval = setInterval(() => {
              if (checkForChange()) {
                clearInterval(pollInterval);
                // Remove the change listener to prevent double-firing
                freshElement.removeEventListener("change", handleChange);
                log.debug(
                  `[Nix Debug] SELECT "${dataTarget}" - polling detected change, advancing`,
                );
                advanceToNextStep();
              }
            }, 300);

            // Store interval for cleanup
            waitingIntervalRef.current = pollInterval;

            log.debug(`[Nix Debug] Added change listener and polling to SELECT "${dataTarget}"`);
          } else if (isCombobox) {
            const initialText = freshElement.textContent?.trim() || "";
            let wasExpanded = false;
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (mutation.type === "attributes" && mutation.attributeName === "aria-expanded") {
                  const currentlyExpanded = freshElement.getAttribute("aria-expanded") === "true";
                  if (wasExpanded && !currentlyExpanded) {
                    setTimeout(() => {
                      const currentText = freshElement.textContent?.trim() || "";
                      const hasSelection =
                        currentText !== initialText &&
                        currentText !== "Select..." &&
                        currentText !== "Select" &&
                        !currentText.includes("Loading");
                      if (hasSelection) {
                        log.debug(
                          `[Nix Debug] Combobox selection confirmed: "${initialText}" -> "${currentText}"`,
                        );
                        advanceToNextStep();
                      } else {
                        log.debug(
                          `[Nix Debug] Combobox closed without selection change: "${currentText}"`,
                        );
                      }
                    }, 300);
                  }
                  wasExpanded = currentlyExpanded;
                }
              });
            });
            observer.observe(freshElement, {
              attributes: true,
              attributeFilter: ["aria-expanded"],
            });
            mutationObserverRef.current = observer;
          } else {
            freshElement.addEventListener("click", advanceToNextStep);
            targetClickHandlerRef.current = advanceToNextStep;
          }
        },
        dataTarget.includes("3d-preview")
          ? 1200
          : dataTarget === "bend-segments-select"
            ? 2000
            : 800,
      );
    },
    [position, savedPosition, endGuidance],
  );

  const clearHighlight = useCallback(() => {
    endGuidance();
  }, [endGuidance]);

  useEffect(() => {
    if (typeof window !== "undefined" && position === null) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const savedPosition = JSON.parse(saved);
          setPosition(savedPosition);
          setHasBeenDragged(true);
        } catch {
          setDefaultPosition();
        }
      } else {
        setDefaultPosition();
      }
    }
  }, [position]);

  const setDefaultPosition = () => {
    setPosition({
      x: 20,
      y: window.innerHeight - BOTTOM_TOOLBAR_HEIGHT - 100,
    });
  };

  const savePosition = useCallback((pos: Position) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!avatarRef.current) return;
    e.preventDefault();
    const rect = avatarRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
    setShowHoverDialog(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.current.x));
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - BOTTOM_TOOLBAR_HEIGHT - 80, e.clientY - dragOffset.current.y),
      );
      const newPos = { x: newX, y: newY };
      setPosition(newPos);
      setHasBeenDragged(true);
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && position) {
      savePosition(position);
    }
    setIsDragging(false);
  }, [isDragging, position, savePosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!avatarRef.current) return;
    const touch = e.touches[0];
    const rect = avatarRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    setIsDragging(true);
    setShowHoverDialog(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 80, touch.clientX - dragOffset.current.x),
      );
      const newY = Math.max(
        0,
        Math.min(
          window.innerHeight - BOTTOM_TOOLBAR_HEIGHT - 80,
          touch.clientY - dragOffset.current.y,
        ),
      );
      const newPos = { x: newX, y: newY };
      setPosition(newPos);
      setHasBeenDragged(true);
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragging && position) {
      savePosition(position);
    }
    setIsDragging(false);
  }, [isDragging, position, savePosition]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleMouseEnter = useCallback(() => {
    if (!isDragging) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowHoverDialog(true);
      }, 300);
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowHoverDialog(false);
  }, []);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowHoverDialog(false);
      setShowChatWindow(false);
      onClose();
    },
    [onClose],
  );

  const handleAvatarClick = useCallback(() => {
    if (!isDragging) {
      setShowHoverDialog(false);
      setShowChatWindow((prev) => !prev);
      if (!showChatWindow) {
        setTimeout(() => chatInputRef.current?.focus(), 100);
      }
    }
  }, [isDragging, showChatWindow]);

  const scrollToBottom = useCallback(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  const moveToPosition = useCallback((location: "top" | "bottom") => {
    const targetSelector =
      location === "top"
        ? '[data-nix-target="add-item-section-top"]'
        : '[data-nix-target="add-item-section"]';

    const targetElement = document.querySelector(targetSelector);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const avatarSize = 64;
      const padding = 20;

      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => {
        const updatedRect = targetElement.getBoundingClientRect();
        const newX = Math.min(
          Math.max(padding, updatedRect.right + padding),
          window.innerWidth - avatarSize - padding,
        );
        const newY = Math.min(
          Math.max(padding, updatedRect.top),
          window.innerHeight - avatarSize - BOTTOM_TOOLBAR_HEIGHT - padding,
        );

        setPosition({ x: newX, y: newY });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: newX, y: newY }));
      }, 400);
    }
  }, []);

  const startDiagnosticForItem = useCallback(
    (result: ItemDiagnosticResult) => {
      const itemIndex = items.findIndex((i) => i.id === result.itemId);
      const lineNumber = itemIndex + 1;
      const typeLabel = ITEM_TYPE_LABELS[result.itemType] ?? result.itemType;

      onStartDiagnostic?.(result.itemId, result.issues);
      setDiagnosticFixStepIndex(0);

      const issueList = result.issues
        .map(
          (issue, idx) =>
            `${idx + 1}. ${issue.message}${issue.suggestedValue !== null ? ` (suggested: ${issue.suggestedValue})` : ""}`,
        )
        .join("\n");

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Diagnosing Item #${lineNumber} (${typeLabel}: ${result.description}):\n\n${issueList}\n\nI'll walk you through each issue. Use "Apply Suggestion" to fix, or set the value yourself.`,
        },
      ]);

      const steps = diagnosticResultsToGuidanceSteps(result.issues);
      if (steps.length > 0) {
        currentStepIndexRef.current = 0;
        setGuidanceFlow({ steps, currentStep: 0, name: `Fix Item #${lineNumber}` });
        if (pendingStepTimeoutRef.current) {
          clearTimeout(pendingStepTimeoutRef.current);
        }
        pendingStepTimeoutRef.current = setTimeout(() => {
          pendingStepTimeoutRef.current = null;
          pointAtElement(steps[0].dataTarget, steps[0].message, steps[0].instruction);
        }, 500);
      }
    },
    [items, onStartDiagnostic, pointAtElement],
  );

  const handleApplySuggestion = useCallback(() => {
    if (!diagnosticTargetItemId || diagnosticIssues.length === 0) return;

    const currentIssue = diagnosticIssues[diagnosticFixStepIndex];
    if (!currentIssue || currentIssue.suggestedValue === null) return;

    onApplyFix?.(diagnosticTargetItemId, currentIssue.field, currentIssue.suggestedValue);

    const nextIndex = diagnosticFixStepIndex + 1;
    if (nextIndex < diagnosticIssues.length) {
      setDiagnosticFixStepIndex(nextIndex);
      const nextIssue = diagnosticIssues[nextIndex];
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Applied ${currentIssue.suggestedValue} to ${currentIssue.field}. Next: ${nextIssue.message}`,
        },
      ]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "All issues fixed for this item!" },
      ]);
      onClearDiagnostic?.();
      endGuidance();
    }
  }, [
    diagnosticTargetItemId,
    diagnosticIssues,
    diagnosticFixStepIndex,
    onApplyFix,
    onClearDiagnostic,
    endGuidance,
  ]);

  const runDiagnosticsInChat = useCallback(() => {
    if (itemDiagnosticResults.length === 0) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "All items look good! No issues found." },
      ]);
      return;
    }

    const summary = itemDiagnosticResults
      .map((result) => {
        const itemIndex = items.findIndex((i) => i.id === result.itemId);
        const typeLabel = ITEM_TYPE_LABELS[result.itemType] ?? result.itemType;
        return `Item #${itemIndex + 1} (${typeLabel}): ${result.issues.length} issue(s)`;
      })
      .join("\n");

    setChatMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Found issues in ${itemDiagnosticResults.length} item(s):\n\n${summary}\n\nClick "Fix" on any item below to walk through the fixes.`,
      },
    ]);
  }, [itemDiagnosticResults, items]);

  const executeQuery = useCallback(
    async (query: string) => {
      if (isLoading) return;

      setChatMessages((prev) => [...prev, { role: "user", content: query }]);
      setIsLoading(true);

      try {
        const intentMatch = matchIntent(query);
        if (intentMatch?.intent === "diagnose") {
          runDiagnosticsInChat();
          return;
        }

        const { response, actions, guidanceSteps } = generateFormGuidance(query);
        setChatMessages((prev) => [...prev, { role: "assistant", content: response, actions }]);

        if (guidanceSteps && guidanceSteps.length > 0) {
          currentStepIndexRef.current = 0;
          setGuidanceFlow({
            steps: guidanceSteps,
            currentStep: 0,
            name: query,
          });
          const firstStep = guidanceSteps[0];
          if (pendingStepTimeoutRef.current) {
            clearTimeout(pendingStepTimeoutRef.current);
          }
          pendingStepTimeoutRef.current = setTimeout(() => {
            pendingStepTimeoutRef.current = null;
            pointAtElement(firstStep.dataTarget, firstStep.message, firstStep.instruction);
          }, 500);
        } else {
          actions.forEach((action) => {
            if (action.type === "point" && action.dataTarget) {
              setTimeout(() => {
                pointAtElement(action.dataTarget!, action.message || "Click here");
              }, 500);
            }
            if (onFormAction) {
              onFormAction(action);
            }
          });
        }
      } catch {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I'm sorry, I encountered an error. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, onFormAction, pointAtElement, runDiagnosticsInChat],
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMessage = inputValue.trim();
    setInputValue("");
    executeQuery(userMessage);
  }, [inputValue, isLoading, executeQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  if (!isVisible || position === null) return null;

  const displayPosition = isPointingAt || position;

  return (
    <>
      {highlightOverlay && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: Z_INDEX_AVATAR + 10 }}
          onClick={clearHighlight}
        >
          <div
            className="absolute bg-black/50"
            style={{ top: 0, left: 0, right: 0, height: highlightOverlay.rect.top }}
          />
          <div
            className="absolute bg-black/50"
            style={{
              top: highlightOverlay.rect.bottom,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="absolute bg-black/50"
            style={{
              top: highlightOverlay.rect.top,
              left: 0,
              width: highlightOverlay.rect.left,
              height: highlightOverlay.rect.height,
            }}
          />
          <div
            className="absolute bg-black/50"
            style={{
              top: highlightOverlay.rect.top,
              left: highlightOverlay.rect.right,
              right: 0,
              height: highlightOverlay.rect.height,
            }}
          />
          <div
            className="absolute border-4 border-amix-orange rounded-lg animate-pulse"
            style={{
              top: highlightOverlay.rect.top - 4,
              left: highlightOverlay.rect.left - 4,
              width: highlightOverlay.rect.width + 8,
              height: highlightOverlay.rect.height + 8,
            }}
          />
          <div
            className="absolute bg-amix-orange text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-lg whitespace-nowrap"
            style={{
              top: highlightOverlay.rect.top - 40,
              left: highlightOverlay.rect.left + highlightOverlay.rect.width / 2,
              transform: "translateX(-50%)",
            }}
          >
            {highlightOverlay.message}
            <div
              className="absolute w-3 h-3 bg-amix-orange rotate-45"
              style={{ bottom: -6, left: "50%", marginLeft: -6 }}
            />
          </div>
        </div>
      )}

      <div
        ref={avatarRef}
        className={`fixed select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          left: displayPosition.x,
          top: displayPosition.y,
          zIndex: Z_INDEX_AVATAR,
          transition: isDragging
            ? "none"
            : isPointingAt
              ? "all 0.5s ease-out"
              : "box-shadow 0.2s ease",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative">
          <div
            onClick={handleAvatarClick}
            className={`w-16 h-16 rounded-full overflow-hidden shadow-lg border-3 border-amix-orange hover:border-amix-orange-dark transition-all duration-200 ${
              isDragging ? "scale-110 shadow-xl" : "hover:scale-105"
            } ${showChatWindow ? "ring-2 ring-amix-orange-light ring-offset-2" : ""}`}
            style={{
              boxShadow: isDragging
                ? "0 20px 40px rgba(0, 0, 0, 0.3)"
                : "0 8px 24px rgba(0, 0, 0, 0.2)",
              cursor: isDragging ? "grabbing" : "pointer",
            }}
          >
            <Image
              src="/nix-avatar.png"
              alt="Nix AI Assistant"
              width={64}
              height={64}
              className="object-cover object-top scale-125"
              draggable={false}
            />
          </div>

          <button
            onClick={handleClose}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center text-xs font-bold shadow-lg transition-colors z-10"
            title="Close Nix helper"
          >
            X
          </button>

          {diagnosticBadgeCount > 0 && !showChatWindow ? (
            <div
              className="absolute -bottom-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse px-1"
              title={`${diagnosticBadgeCount} item(s) with issues`}
            >
              {diagnosticBadgeCount}
            </div>
          ) : (
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${showChatWindow ? "" : "animate-pulse"}`}
              style={{ backgroundColor: showChatWindow ? "#22c55e" : "#FFA500" }}
            />
          )}

          {isPointingAt && highlightOverlay && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: 64,
                top: 32,
                width: 40,
                height: 2,
                background: "linear-gradient(90deg, #f97316, #f97316 60%, transparent)",
                transformOrigin: "left center",
                transform: `rotate(${
                  (Math.atan2(
                    highlightOverlay.rect.top +
                      highlightOverlay.rect.height / 2 -
                      displayPosition.y -
                      32,
                    highlightOverlay.rect.left - displayPosition.x - 64,
                  ) *
                    180) /
                  Math.PI
                }deg)`,
              }}
            >
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderLeft: "10px solid #f97316",
                }}
              />
            </div>
          )}
        </div>

        {showHoverDialog && !isDragging && !showChatWindow && !guidanceFlow && !isPointingAt && (
          <div
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72"
            style={{
              zIndex: Z_INDEX_DIALOG,
              left: position.x < window.innerWidth / 2 ? "100%" : "auto",
              right: position.x >= window.innerWidth / 2 ? "100%" : "auto",
              marginLeft: position.x < window.innerWidth / 2 ? "12px" : "0",
              marginRight: position.x >= window.innerWidth / 2 ? "12px" : "0",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-amix-orange">
                <Image
                  src="/nix-avatar.png"
                  alt="Nix"
                  width={40}
                  height={40}
                  className="object-cover object-top scale-125"
                />
              </div>
              <div>
                {diagnosticBadgeCount > 0 ? (
                  <>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      I noticed {diagnosticBadgeCount} item(s) with issues
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Click me and I can help fix them step by step!
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      Need help with the form?
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Click me and ask things like &quot;How do I add a sweep tee?&quot; and
                      I&apos;ll guide you step by step!
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 italic">
                {hasBeenDragged
                  ? "I\u0027ll stay right here where you put me."
                  : "Tip: Drag me anywhere on the screen!"}
              </p>
            </div>
            <div
              className={`absolute w-3 h-3 bg-white border-gray-200 rotate-45 ${
                position.x < window.innerWidth / 2
                  ? "left-0 -translate-x-1/2 border-l border-b"
                  : "right-0 translate-x-1/2 border-r border-t"
              }`}
              style={{ top: "50%", marginTop: "-6px" }}
            />
          </div>
        )}

        {showChatWindow && (
          <div
            className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[500px] flex flex-col"
            style={{
              zIndex: Z_INDEX_CHAT,
              left: position.x < window.innerWidth / 2 ? "100%" : "auto",
              right: position.x >= window.innerWidth / 2 ? "100%" : "auto",
              marginLeft: position.x < window.innerWidth / 2 ? "12px" : "0",
              marginRight: position.x >= window.innerWidth / 2 ? "12px" : "0",
              bottom: "0",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gradient-to-r from-amix-orange to-amix-orange-light rounded-t-lg">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                <Image
                  src="/nix-avatar.png"
                  alt="Nix"
                  width={32}
                  height={32}
                  className="object-cover object-top scale-125"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white text-sm">Nix Form Helper</h4>
                <p className="text-xs text-white/80">Ask me how to fill out your RFQ</p>
              </div>
              <button
                onClick={() => setShowChatWindow(false)}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs transition-colors z-[10010] relative"
              >
                x
              </button>
            </div>

            <div
              ref={chatMessagesRef}
              className="flex-1 overflow-y-auto p-3 space-y-3 min-h-56 max-h-80"
            >
              {chatMessages.length === 0 && !pendingAction && (
                <div className="text-gray-500 text-sm py-2">
                  {unacknowledgedDiagnostics.length > 0 ? (
                    <>
                      <p className="font-medium text-center text-red-600">
                        I noticed {unacknowledgedDiagnostics.length} item(s) with issues
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {unacknowledgedDiagnostics.map((result) => {
                          const itemIndex = items.findIndex((i) => i.id === result.itemId);
                          const typeLabel = ITEM_TYPE_LABELS[result.itemType] ?? result.itemType;
                          return (
                            <button
                              key={result.itemId}
                              onClick={() => startDiagnosticForItem(result)}
                              className="w-full px-3 py-2 text-xs bg-red-50 hover:bg-red-100 rounded-lg text-red-700 transition-colors border border-red-200 hover:border-red-300 text-left flex items-center justify-between"
                            >
                              <span>
                                Fix Item #{itemIndex + 1} ({typeLabel})
                              </span>
                              <span className="text-red-400">{result.issues.length} issue(s)</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2 text-center">Or add new items:</p>
                      </div>
                    </>
                  ) : (
                    <p className="font-medium text-center">
                      Hi! I&apos;m Nix. What would you like to add?
                    </p>
                  )}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {QUICK_ACTIONS.filter((a) => a.category === "add").map((action) => (
                        <button
                          key={action.label}
                          onClick={() =>
                            setPendingAction({ query: action.query, itemType: action.label })
                          }
                          className="px-3 py-1.5 text-xs bg-amix-orange/10 hover:bg-amix-orange/20 rounded-full text-amix-orange-dark transition-colors border border-amix-orange/20 hover:border-amix-orange/40"
                        >
                          + {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-2 text-center">Need help?</p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {items.length > 0 && (
                        <button
                          onClick={runDiagnosticsInChat}
                          className="px-2.5 py-1.5 text-xs bg-red-50 hover:bg-red-100 rounded-full text-red-600 transition-colors border border-red-200 hover:border-red-300"
                        >
                          Check Items
                        </button>
                      )}
                      {QUICK_ACTIONS.filter((a) => a.category === "help").map((action) => (
                        <button
                          key={action.label}
                          onClick={() => executeQuery(action.query)}
                          className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors border border-gray-200 hover:border-gray-300"
                        >
                          ? {action.label.replace(" Help", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-400 text-center">
                    Or type your question below
                  </p>
                </div>
              )}
              {pendingAction && chatMessages.length === 0 && (
                <div className="text-gray-600 text-sm py-2">
                  <p className="font-medium text-center">
                    Where would you like to add this {pendingAction.itemType}?
                  </p>
                  <div className="mt-4 flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        const query = pendingAction.query;
                        setPendingAction(null);
                        moveToPosition("top");
                        setTimeout(() => executeQuery(`${query} at top`), 400);
                      }}
                      className="px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors border border-blue-200 hover:border-blue-300 flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                      At the top
                    </button>
                    <button
                      onClick={() => {
                        const query = pendingAction.query;
                        setPendingAction(null);
                        moveToPosition("bottom");
                        setTimeout(() => executeQuery(query), 400);
                      }}
                      className="px-4 py-2 text-sm bg-amix-orange/10 hover:bg-amix-orange/20 rounded-lg text-amix-orange-dark transition-colors border border-amix-orange/20 hover:border-amix-orange/40 flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                      At the bottom
                    </button>
                  </div>
                  <button
                    onClick={() => setPendingAction(null)}
                    className="mt-3 text-xs text-gray-400 hover:text-gray-600 block mx-auto"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-amix-orange text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 rounded-bl-none">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {highlightOverlay && (
                <div className="pt-2 space-y-2">
                  {currentInstruction && (
                    <div className="bg-amix-orange/10 border border-amix-orange/30 rounded-lg p-2 text-sm text-amix-orange-dark">
                      {currentInstruction}
                    </div>
                  )}
                  {guidanceFlow && (
                    <div className="text-xs text-gray-500 text-center">
                      Step {guidanceFlow.currentStep + 1} of {guidanceFlow.steps.length}
                    </div>
                  )}
                  <div className="flex justify-center gap-2">
                    {diagnosticTargetItemId &&
                      diagnosticIssues[diagnosticFixStepIndex]?.suggestedValue !== null &&
                      diagnosticIssues[diagnosticFixStepIndex]?.suggestedValue !== undefined && (
                        <button
                          onClick={handleApplySuggestion}
                          className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-md"
                        >
                          Apply Suggestion
                        </button>
                      )}
                    {diagnosticTargetItemId && (
                      <button
                        onClick={() => {
                          onDismissDiagnostic?.(diagnosticTargetItemId);
                          endGuidance();
                        }}
                        className="px-4 py-2 bg-gray-400 text-white text-sm font-semibold rounded-lg hover:bg-gray-500 transition-colors shadow-md"
                      >
                        Dismiss
                      </button>
                    )}
                    {!diagnosticTargetItemId && (
                      <button
                        onClick={clearHighlight}
                        className="px-4 py-2 bg-gray-400 text-white text-sm font-semibold rounded-lg hover:bg-gray-500 transition-colors shadow-md"
                      >
                        {guidanceFlow ? "Skip Tutorial" : "Got it!"}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {chatMessages.length > 0 &&
                !highlightOverlay &&
                itemDiagnosticResults.length > 0 &&
                !diagnosticTargetItemId && (
                  <div className="pt-2 space-y-1.5">
                    <p className="text-xs text-gray-400 text-center">Items with issues:</p>
                    {itemDiagnosticResults
                      .filter((r) => !diagnosticDismissedIds.includes(r.itemId))
                      .map((result) => {
                        const itemIndex = items.findIndex((i) => i.id === result.itemId);
                        const typeLabel = ITEM_TYPE_LABELS[result.itemType] ?? result.itemType;
                        return (
                          <button
                            key={result.itemId}
                            onClick={() => startDiagnosticForItem(result)}
                            className="w-full px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 rounded-lg text-red-700 transition-colors border border-red-200 hover:border-red-300 text-left flex items-center justify-between"
                          >
                            <span>
                              Fix Item #{itemIndex + 1} ({typeLabel})
                            </span>
                            <span className="text-red-400">{result.issues.length} issue(s)</span>
                          </button>
                        );
                      })}
                  </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me how to fill out the form..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amix-orange focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-3 py-2 bg-amix-orange text-white rounded-lg hover:bg-amix-orange-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function NixMinimizedButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm hover:shadow-md"
      title="Click to reactivate Nix helper"
    >
      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-amix-orange-light shadow-sm">
        <Image
          src="/nix-avatar.png"
          alt="Nix"
          width={24}
          height={24}
          className="object-cover object-top scale-125"
        />
      </div>
      <span className="text-xs font-medium text-white">Ask Nix</span>
    </button>
  );
}
