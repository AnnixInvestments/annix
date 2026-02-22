import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NixClarificationDto, NixExtractedItem } from "@/app/lib/nix";
import type { ItemIssue } from "@/app/lib/utils/itemDiagnostics";

interface NixState {
  showNixPopup: boolean;
  isNixProcessing: boolean;
  nixProcessingProgress: number;
  nixProcessingStatus: string;
  nixProcessingTimeRemaining: number | null;
  nixExtractionId: number | null;
  nixExtractedItems: NixExtractedItem[];
  nixClarifications: NixClarificationDto[];
  currentClarificationIndex: number;
  showNixClarification: boolean;
  nixFormHelperVisible: boolean;
  nixFormHelperMinimized: boolean;
  nixDiagnosticTargetItemId: string | null;
  nixDiagnosticIssues: ItemIssue[];
  nixDiagnosticDismissedIds: string[];
  nixDiagnosticAutoOffered: boolean;

  nixChatSessionId: number | null;
  nixChatPanelVisible: boolean;
  nixChatPanelGeometry: { x: number; y: number; width: number; height: number } | null;

  nixGuidedModeActive: boolean;
  nixGuidedModeCurrentField: string | null;
  nixGuidedModeCompletedFields: string[];
  nixGuidedModePaused: boolean;
  nixGuidedModeTooltipMessage: string | null;
}

interface NixActions {
  nixShowPopup: () => void;
  nixHidePopup: () => void;
  nixSetProcessing: (processing: boolean) => void;
  nixSetProgress: (progress: number, status: string, timeRemaining?: number | null) => void;
  nixSetExtractionId: (id: number | null) => void;
  nixSetExtractedItems: (items: NixExtractedItem[]) => void;
  nixSetClarifications: (clarifications: NixClarificationDto[]) => void;
  nixSetCurrentClarificationIndex: (index: number) => void;
  nixShowClarificationModal: (show: boolean) => void;

  nixFormHelperClose: () => void;
  nixFormHelperReactivate: () => void;
  nixStartDiagnostic: (itemId: string, issues: ItemIssue[]) => void;
  nixDismissDiagnostic: (itemId: string) => void;
  nixClearDiagnostic: () => void;
  nixResetDiagnosticDismissals: () => void;

  nixOpenChatPanel: () => void;
  nixCloseChatPanel: () => void;
  nixSetChatSessionId: (sessionId: number | null) => void;
  nixSetChatPanelGeometry: (geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;

  nixStartGuidedMode: () => void;
  nixEndGuidedMode: () => void;
  nixPauseGuidedMode: () => void;
  nixResumeGuidedMode: () => void;
  nixFocusGuidedField: (fieldId: string, tooltipMessage?: string) => void;
  nixMarkFieldComplete: (fieldId: string) => void;
  nixSkipGuidedField: () => void;
  nixAdvanceToNextField: () => void;
  nixClearGuidedModeTooltip: () => void;

  nixReset: () => void;
}

export type NixStore = NixState & NixActions;

const initialNixState: NixState = {
  showNixPopup: false,
  isNixProcessing: false,
  nixProcessingProgress: 0,
  nixProcessingStatus: "Initializing...",
  nixProcessingTimeRemaining: null,
  nixExtractionId: null,
  nixExtractedItems: [],
  nixClarifications: [],
  currentClarificationIndex: 0,
  showNixClarification: false,
  nixFormHelperVisible: true,
  nixFormHelperMinimized: false,
  nixDiagnosticTargetItemId: null,
  nixDiagnosticIssues: [],
  nixDiagnosticDismissedIds: [],
  nixDiagnosticAutoOffered: false,

  nixChatSessionId: null,
  nixChatPanelVisible: false,
  nixChatPanelGeometry: null,

  nixGuidedModeActive: false,
  nixGuidedModeCurrentField: null,
  nixGuidedModeCompletedFields: [],
  nixGuidedModePaused: false,
  nixGuidedModeTooltipMessage: null,
};

export const useNixStore = create<NixStore>()(
  devtools(
    (set) => ({
      ...initialNixState,

      nixShowPopup: () => set({ showNixPopup: true }, false, "nixShowPopup"),

      nixHidePopup: () => set({ showNixPopup: false }, false, "nixHidePopup"),

      nixSetProcessing: (processing) =>
        set({ isNixProcessing: processing }, false, "nixSetProcessing"),

      nixSetProgress: (progress, status, timeRemaining = null) =>
        set(
          {
            nixProcessingProgress: progress,
            nixProcessingStatus: status,
            nixProcessingTimeRemaining: timeRemaining,
          },
          false,
          "nixSetProgress",
        ),

      nixSetExtractionId: (id) => set({ nixExtractionId: id }, false, "nixSetExtractionId"),

      nixSetExtractedItems: (items) =>
        set({ nixExtractedItems: items }, false, "nixSetExtractedItems"),

      nixSetClarifications: (clarifications) =>
        set({ nixClarifications: clarifications }, false, "nixSetClarifications"),

      nixSetCurrentClarificationIndex: (index) =>
        set({ currentClarificationIndex: index }, false, "nixSetCurrentClarificationIndex"),

      nixShowClarificationModal: (show) =>
        set({ showNixClarification: show }, false, "nixShowClarificationModal"),

      nixFormHelperClose: () =>
        set(
          { nixFormHelperVisible: false, nixFormHelperMinimized: true },
          false,
          "nixFormHelperClose",
        ),

      nixFormHelperReactivate: () =>
        set(
          { nixFormHelperVisible: true, nixFormHelperMinimized: false },
          false,
          "nixFormHelperReactivate",
        ),

      nixStartDiagnostic: (itemId, issues) =>
        set(
          { nixDiagnosticTargetItemId: itemId, nixDiagnosticIssues: issues },
          false,
          "nixStartDiagnostic",
        ),

      nixDismissDiagnostic: (itemId) =>
        set(
          (state) => ({
            nixDiagnosticTargetItemId: null,
            nixDiagnosticIssues: [],
            nixDiagnosticDismissedIds: [...state.nixDiagnosticDismissedIds, itemId],
          }),
          false,
          "nixDismissDiagnostic",
        ),

      nixClearDiagnostic: () =>
        set(
          { nixDiagnosticTargetItemId: null, nixDiagnosticIssues: [] },
          false,
          "nixClearDiagnostic",
        ),

      nixResetDiagnosticDismissals: () =>
        set(
          { nixDiagnosticDismissedIds: [], nixDiagnosticAutoOffered: false },
          false,
          "nixResetDiagnosticDismissals",
        ),

      nixOpenChatPanel: () => set({ nixChatPanelVisible: true }, false, "nixOpenChatPanel"),

      nixCloseChatPanel: () => set({ nixChatPanelVisible: false }, false, "nixCloseChatPanel"),

      nixSetChatSessionId: (sessionId) =>
        set({ nixChatSessionId: sessionId }, false, "nixSetChatSessionId"),

      nixSetChatPanelGeometry: (geometry) =>
        set({ nixChatPanelGeometry: geometry }, false, "nixSetChatPanelGeometry"),

      nixStartGuidedMode: () =>
        set(
          {
            nixGuidedModeActive: true,
            nixGuidedModeCurrentField: null,
            nixGuidedModeCompletedFields: [],
            nixGuidedModePaused: false,
            nixGuidedModeTooltipMessage: null,
          },
          false,
          "nixStartGuidedMode",
        ),

      nixEndGuidedMode: () =>
        set(
          {
            nixGuidedModeActive: false,
            nixGuidedModeCurrentField: null,
            nixGuidedModePaused: false,
            nixGuidedModeTooltipMessage: null,
          },
          false,
          "nixEndGuidedMode",
        ),

      nixPauseGuidedMode: () => set({ nixGuidedModePaused: true }, false, "nixPauseGuidedMode"),

      nixResumeGuidedMode: () => set({ nixGuidedModePaused: false }, false, "nixResumeGuidedMode"),

      nixFocusGuidedField: (fieldId, tooltipMessage) =>
        set(
          {
            nixGuidedModeCurrentField: fieldId,
            nixGuidedModeTooltipMessage: tooltipMessage ?? null,
          },
          false,
          "nixFocusGuidedField",
        ),

      nixMarkFieldComplete: (fieldId) =>
        set(
          (state) => ({
            nixGuidedModeCompletedFields: state.nixGuidedModeCompletedFields.includes(fieldId)
              ? state.nixGuidedModeCompletedFields
              : [...state.nixGuidedModeCompletedFields, fieldId],
          }),
          false,
          "nixMarkFieldComplete",
        ),

      nixSkipGuidedField: () =>
        set(
          (state) => ({
            nixGuidedModeCompletedFields: state.nixGuidedModeCurrentField
              ? state.nixGuidedModeCompletedFields.includes(state.nixGuidedModeCurrentField)
                ? state.nixGuidedModeCompletedFields
                : [...state.nixGuidedModeCompletedFields, state.nixGuidedModeCurrentField]
              : state.nixGuidedModeCompletedFields,
            nixGuidedModeCurrentField: null,
            nixGuidedModeTooltipMessage: null,
          }),
          false,
          "nixSkipGuidedField",
        ),

      nixAdvanceToNextField: () =>
        set(
          { nixGuidedModeCurrentField: null, nixGuidedModeTooltipMessage: null },
          false,
          "nixAdvanceToNextField",
        ),

      nixClearGuidedModeTooltip: () =>
        set({ nixGuidedModeTooltipMessage: null }, false, "nixClearGuidedModeTooltip"),

      nixReset: () => set(initialNixState, false, "nixReset"),
    }),
    { name: "nix-store" },
  ),
);
