import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  anonymousDraftsApi,
  type CreateStraightPipeRfqDto,
  type StraightPipeCalculationResult,
} from "@/app/lib/api/client";
import { addDaysFromNowISODate, generateUniqueId, nowMillis } from "@/app/lib/datetime";
import type {
  BendEntry,
  ExpansionJointEntry,
  FittingEntry,
  GlobalSpecs,
  InstrumentEntry,
  PipeItem,
  PipeSteelWorkEntry,
  PumpEntry,
  RfqFormData,
  StraightPipeEntry,
  ValveEntry,
} from "@/app/lib/hooks/useRfqForm";
import { log } from "@/app/lib/logger";
import { type NixClarificationDto, type NixExtractedItem, nixApi } from "@/app/lib/nix";
import type { ItemIssue } from "@/app/lib/utils/itemDiagnostics";
import { generateClientItemNumber } from "@/app/lib/utils/systemUtils";

export interface PendingDocument {
  file: File;
  id: string;
}

export interface DraftFormData {
  projectName?: string;
  projectType?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  requiredProducts?: string[];
  notes?: string;
  latitude?: number;
  longitude?: number;
  siteAddress?: string;
  region?: string;
  country?: string;
  mineId?: number;
  mineName?: string;
  skipDocuments?: boolean;
  useNix?: boolean;
  nixPopupShown?: boolean;
}

export interface MasterData {
  steelSpecs: Array<{ id: number; steelSpecName: string }>;
  flangeStandards: Array<{ id: number; code: string }>;
  pressureClasses: Array<{ id: number; designation: string }>;
  nominalBores?: Array<{
    id: number;
    nominal_diameter_mm?: number;
    outside_diameter_mm?: number;
    nominalDiameterMm?: number;
    outsideDiameterMm?: number;
  }>;
  flangeTypes?: Array<{ id: number; code: string; name: string }>;
}

const DEFAULT_PIPE_SPECS: Partial<CreateStraightPipeRfqDto> = {
  scheduleType: "schedule",
  pipeEndConfiguration: "PE",
  lengthUnit: "meters",
  quantityType: "number_of_pipes",
  quantityValue: 1,
};

const initialRfqData = (): RfqFormData => ({
  projectName: "",
  projectType: undefined,
  description: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  requiredDate: addDaysFromNowISODate(30),
  requiredProducts: [],
  notes: "",
  globalSpecs: {},
  items: [],
  straightPipeEntries: [],
  useNix: false,
  nixPopupShown: false,
});

interface RfqWizardState {
  currentStep: number;
  rfqData: RfqFormData;

  masterData: MasterData;
  isLoadingMasterData: boolean;

  availableSchedulesMap: Record<string, any[]>;
  pressureClassesByStandard: Record<number, any[]>;
  availablePressureClasses: any[];
  bendOptionsCache: Record<string, { nominalBores: number[]; degrees: number[] }>;

  validationErrors: Record<string, string>;
  isSubmitting: boolean;

  pendingDocuments: PendingDocument[];
  pendingTenderDocuments: PendingDocument[];

  showCloseConfirmation: boolean;

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

  currentDraftId: number | null;
  draftNumber: string | null;
  isSavingDraft: boolean;
  isLoadingDraft: boolean;
  showDraftRestorePrompt: boolean;
  pendingLocalDraft: any;
  showSaveProgressDialog: boolean;
  isSavingProgress: boolean;
  saveProgressStep: "confirm" | "success";
  hasCheckedLocalDraft: boolean;
  hasProcessedRecoveryToken: boolean;
}

interface RfqWizardActions {
  setCurrentStep: (step: number) => void;
  updateRfqField: <K extends keyof Omit<RfqFormData, "straightPipeEntries">>(
    field: K,
    value: RfqFormData[K],
  ) => void;
  updateGlobalSpecs: (specs: GlobalSpecs) => void;

  addStraightPipeEntry: (description?: string, insertAtStart?: boolean) => string;
  addBendEntry: (description?: string, insertAtStart?: boolean) => string;
  addFittingEntry: (description?: string, insertAtStart?: boolean) => string;
  addPipeSteelWorkEntry: (description?: string, insertAtStart?: boolean) => string;
  addExpansionJointEntry: (description?: string, insertAtStart?: boolean) => string;
  addValveEntry: (description?: string, insertAtStart?: boolean) => string;
  addInstrumentEntry: (description?: string, insertAtStart?: boolean) => string;
  addPumpEntry: (description?: string, insertAtStart?: boolean) => string;

  updateStraightPipeEntry: (id: string, updates: Partial<Omit<StraightPipeEntry, "id">>) => void;
  updateItem: (id: string, updates: Partial<Omit<PipeItem, "id" | "itemType">>) => void;
  removeStraightPipeEntry: (id: string) => void;
  duplicateItem: (entryToDuplicate: PipeItem, insertAfterIndex?: number) => string;
  updateEntryCalculation: (id: string, calculation: StraightPipeCalculationResult) => void;

  totalWeight: () => number;
  totalValue: () => number;

  nextStep: () => void;
  prevStep: () => void;
  resetForm: () => void;
  restoreFromDraft: (draft: {
    formData?: Record<string, any>;
    globalSpecs?: GlobalSpecs;
    requiredProducts?: string[];
    straightPipeEntries?: any[];
    currentStep?: number;
  }) => void;

  setMasterData: (data: MasterData) => void;
  setIsLoadingMasterData: (loading: boolean) => void;

  setAvailableSchedulesMap: (
    mapOrUpdater: Record<string, any[]> | ((prev: Record<string, any[]>) => Record<string, any[]>),
  ) => void;
  setPressureClassesByStandard: (
    mapOrUpdater: Record<number, any[]> | ((prev: Record<number, any[]>) => Record<number, any[]>),
  ) => void;
  setAvailablePressureClasses: (classes: any[]) => void;
  setBendOptionsCache: (
    cacheOrUpdater:
      | Record<string, { nominalBores: number[]; degrees: number[] }>
      | ((
          prev: Record<string, { nominalBores: number[]; degrees: number[] }>,
        ) => Record<string, { nominalBores: number[]; degrees: number[] }>),
  ) => void;

  setValidationErrors: (errors: Record<string, string>) => void;
  setValidationError: (field: string, message: string | null) => void;
  setIsSubmitting: (submitting: boolean) => void;

  addDocument: (doc: PendingDocument) => void;
  removeDocument: (id: string) => void;
  setPendingDocuments: (docs: PendingDocument[]) => void;
  addTenderDocument: (doc: PendingDocument) => void;
  removeTenderDocument: (id: string) => void;
  setPendingTenderDocuments: (docs: PendingDocument[]) => void;

  setShowCloseConfirmation: (show: boolean) => void;

  nixShowPopup: () => void;
  nixAccept: () => void;
  nixDecline: () => void;
  nixStopUsing: () => void;
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
  nixCloseClarification: () => void;
  nixProcessDocuments: (
    showToast: (msg: string, type: "success" | "error" | "info") => void,
  ) => Promise<void>;
  nixSubmitClarification: (
    clarificationId: number,
    response: string,
    showToast: (msg: string, type: "success" | "error" | "info") => void,
  ) => Promise<void>;
  nixSkipClarification: (
    clarificationId: number,
    showToast: (msg: string, type: "success" | "error" | "info") => void,
  ) => Promise<void>;
  nixItemsPageReady: (showToast: (msg: string, type: "success" | "error" | "info") => void) => void;

  setCurrentDraftId: (id: number | null) => void;
  setDraftNumber: (number: string | null) => void;
  setIsSavingDraft: (saving: boolean) => void;
  setIsLoadingDraft: (loading: boolean) => void;
  setShowDraftRestorePrompt: (show: boolean) => void;
  setPendingLocalDraft: (draft: any) => void;
  setHasCheckedLocalDraft: (checked: boolean) => void;
  setHasProcessedRecoveryToken: (processed: boolean) => void;
  draftOpenSaveProgressDialog: () => void;
  draftCloseSaveProgressDialog: () => void;
  draftSaveProgressToServer: (
    showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void,
  ) => Promise<void>;
  draftSaveAndSendRecoveryEmail: (isAuthenticated: boolean) => Promise<void>;
}

export type RfqWizardStore = RfqWizardState & RfqWizardActions;

export const useRfqWizardStore = create<RfqWizardStore>()(
  devtools(
    (set, get) => {
      const convertNixItemsToRfqItems = (nixItems: NixExtractedItem[]) => {
        const { rfqData, updateRfqField } = get();
        const customerName = rfqData.customerName || "NIX";

        const flangeMap: Record<string, "FBE" | "FOE" | "PE"> = {
          one_end: "FOE",
          both_ends: "FBE",
          none: "PE",
          puddle: "FBE",
          blind: "FBE",
        };

        const allItems = nixItems.flatMap((item, idx): PipeItem[] => {
          if (!item.diameter) return [];

          const itemIndex = idx + 1;
          const unitLower = (item.unit || "").toLowerCase().trim();
          const isMetersUnit =
            unitLower === "m" ||
            unitLower === "meters" ||
            unitLower === "metre" ||
            unitLower === "metres" ||
            unitLower === "lm";

          const materialNote = item.material
            ? ` | Material: ${item.material}${item.materialGrade ? ` (${item.materialGrade})` : ""}`
            : "";
          const wallNote = item.wallThickness ? ` | Wall: ${item.wallThickness}mm` : "";
          const nixNote = `Extracted by Nix from Row ${item.rowNumber} (${Math.round(item.confidence * 100)}% confidence)${materialNote}${wallNote}`;

          log.debug(
            `Converting Nix item ${item.rowNumber}: material=${item.material}, wallThickness=${item.wallThickness}, unit=${item.unit}, isMeters=${isMetersUnit}`,
          );

          if (item.itemType === "pipe" || item.itemType === "flange") {
            const pipeEntry: StraightPipeEntry = {
              id: generateUniqueId(),
              itemType: "straight_pipe" as const,
              clientItemNumber:
                item.itemNumber || generateClientItemNumber(customerName, itemIndex),
              description: item.description,
              specs: {
                nominalBoreMm: item.diameter,
                scheduleType: item.schedule
                  ? "schedule"
                  : item.wallThickness
                    ? "wall_thickness"
                    : "schedule",
                scheduleNumber: item.schedule || undefined,
                wallThicknessMm: item.wallThickness || undefined,
                pipeEndConfiguration: flangeMap[item.flangeConfig || "none"] || "PE",
                individualPipeLength: isMetersUnit ? 6000 : item.length || 6000,
                lengthUnit: "meters" as const,
                quantityType: isMetersUnit
                  ? ("total_length" as const)
                  : ("number_of_pipes" as const),
                quantityValue: item.quantity || 1,
                workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
                workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
                steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
              },
              notes: nixNote,
            };
            return [pipeEntry];
          } else if (item.itemType === "bend") {
            const bendEntry: BendEntry = {
              id: generateUniqueId(),
              itemType: "bend" as const,
              clientItemNumber:
                item.itemNumber || generateClientItemNumber(customerName, itemIndex),
              description: item.description,
              specs: {
                nominalBoreMm: item.diameter,
                scheduleNumber: item.schedule || undefined,
                wallThicknessMm: item.wallThickness || undefined,
                bendType: "1.5D",
                bendDegrees: item.angle || 90,
                numberOfTangents: 0,
                numberOfStubs: 0,
                quantityValue: item.quantity || 1,
                quantityType: "number_of_items" as const,
                workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
                workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
                steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
              },
              notes: nixNote,
            };
            return [bendEntry];
          } else if (
            item.itemType === "tee" ||
            item.itemType === "reducer" ||
            item.itemType === "expansion_joint"
          ) {
            const fittingType =
              item.itemType === "tee"
                ? "EQUAL_TEE"
                : item.itemType === "reducer"
                  ? "CONCENTRIC_REDUCER"
                  : "EXPANSION_LOOP";

            const fittingEntry: FittingEntry = {
              id: generateUniqueId(),
              itemType: "fitting" as const,
              clientItemNumber:
                item.itemNumber || generateClientItemNumber(customerName, itemIndex),
              description: item.description,
              specs: {
                fittingStandard: "SABS719",
                fittingType: fittingType,
                nominalDiameterMm: item.diameter,
                scheduleNumber: item.schedule || undefined,
                quantityValue: item.quantity || 1,
                quantityType: "number_of_items" as const,
                workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
                workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
                steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
              },
              notes: nixNote,
            };
            return [fittingEntry];
          }
          return [];
        });

        if (allItems.length > 0) {
          log.debug(`Converting ${allItems.length} Nix items to RFQ items`);
          updateRfqField("items", [...(rfqData.items || []), ...allItems] as any);
        }
      };

      const buildDraftFormData = (): DraftFormData => {
        const { rfqData } = get();
        return {
          projectName: rfqData.projectName,
          projectType: rfqData.projectType,
          description: rfqData.description,
          customerName: rfqData.customerName,
          customerEmail: rfqData.customerEmail,
          customerPhone: rfqData.customerPhone,
          requiredDate: rfqData.requiredDate,
          requiredProducts: rfqData.requiredProducts,
          notes: rfqData.notes,
          latitude: rfqData.latitude,
          longitude: rfqData.longitude,
          siteAddress: rfqData.siteAddress,
          region: rfqData.region,
          country: rfqData.country,
          mineId: rfqData.mineId,
          mineName: rfqData.mineName,
          skipDocuments: rfqData.skipDocuments,
          useNix: rfqData.useNix,
          nixPopupShown: rfqData.nixPopupShown,
        };
      };

      return {
        currentStep: 1,
        rfqData: initialRfqData(),

        masterData: { steelSpecs: [], flangeStandards: [], pressureClasses: [], nominalBores: [] },
        isLoadingMasterData: true,

        availableSchedulesMap: {},
        pressureClassesByStandard: {},
        availablePressureClasses: [],
        bendOptionsCache: {},

        validationErrors: {},
        isSubmitting: false,

        pendingDocuments: [],
        pendingTenderDocuments: [],

        showCloseConfirmation: false,

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

        currentDraftId: null,
        draftNumber: null,
        isSavingDraft: false,
        isLoadingDraft: false,
        showDraftRestorePrompt: false,
        pendingLocalDraft: null,
        showSaveProgressDialog: false,
        isSavingProgress: false,
        saveProgressStep: "confirm",
        hasCheckedLocalDraft: false,
        hasProcessedRecoveryToken: false,

        setCurrentStep: (step) => set({ currentStep: step }, false, "setCurrentStep"),

        updateRfqField: (field, value) =>
          set(
            (state) => ({ rfqData: { ...state.rfqData, [field]: value } }),
            false,
            "updateRfqField",
          ),

        updateGlobalSpecs: (specs) =>
          set(
            (state) => ({ rfqData: { ...state.rfqData, globalSpecs: specs } }),
            false,
            "updateGlobalSpecs",
          ),

        addStraightPipeEntry: (description, insertAtStart) => {
          const newEntry: StraightPipeEntry = {
            id: generateUniqueId(),
            itemType: "straight_pipe",
            description: description || "New Straight Pipe Item - Please configure specifications",
            specs: { ...DEFAULT_PIPE_SPECS } as CreateStraightPipeRfqDto,
            notes: "",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
                straightPipeEntries: insertAtStart
                  ? [newEntry, ...state.rfqData.straightPipeEntries]
                  : [...state.rfqData.straightPipeEntries, newEntry],
              },
            }),
            false,
            "addStraightPipeEntry",
          );

          return newEntry.id;
        },

        addBendEntry: (description, insertAtStart) => {
          const newEntry: BendEntry = {
            id: generateUniqueId(),
            itemType: "bend",
            description: description || "New Bend Item",
            specs: {
              nominalBoreMm: undefined,
              scheduleNumber: undefined,
              bendType: undefined,
              bendDegrees: 90,
              numberOfTangents: 0,
              tangentLengths: [],
              numberOfStubs: 0,
              stubs: [],
              quantityValue: 1,
              quantityType: "number_of_items",
              workingPressureBar: undefined,
              workingTemperatureC: undefined,
              steelSpecificationId: undefined,
              useGlobalFlangeSpecs: true,
            },
            notes: "Custom bend fabrication required",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
              },
            }),
            false,
            "addBendEntry",
          );

          return newEntry.id;
        },

        addFittingEntry: (description, insertAtStart) => {
          const { rfqData } = get();
          const steelSpecId = rfqData.globalSpecs?.steelSpecificationId || 2;
          const fittingStandard = steelSpecId === 8 ? "SABS719" : "SABS62";

          const newEntry: FittingEntry = {
            id: generateUniqueId(),
            itemType: "fitting",
            description: description || "New Fitting Item",
            specs: {
              fittingStandard: fittingStandard as "SABS62" | "SABS719",
              fittingType: undefined,
              nominalDiameterMm: undefined,
              pipeLengthAMm: undefined,
              pipeLengthBMm: undefined,
              quantityValue: 1,
              quantityType: "number_of_items",
              workingPressureBar: undefined,
              workingTemperatureC: undefined,
              steelSpecificationId: undefined,
            },
            notes: "Fitting with pipe sections",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
              },
            }),
            false,
            "addFittingEntry",
          );

          return newEntry.id;
        },

        addPipeSteelWorkEntry: (description, insertAtStart) => {
          const { rfqData } = get();
          const newEntry: PipeSteelWorkEntry = {
            id: generateUniqueId(),
            itemType: "pipe_steel_work",
            description: description || "New Pipe Steel Work Item",
            specs: {
              workType: "pipe_support",
              nominalDiameterMm: undefined,
              bracketType: "clevis_hanger",
              quantity: 1,
              workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            },
            notes: "",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
              },
            }),
            false,
            "addPipeSteelWorkEntry",
          );

          return newEntry.id;
        },

        addExpansionJointEntry: (description, insertAtStart) => {
          const { rfqData } = get();
          const newEntry: ExpansionJointEntry = {
            id: generateUniqueId(),
            itemType: "expansion_joint",
            description: description || "New Expansion Joint",
            specs: {
              expansionJointType: "bought_in_bellows",
              nominalDiameterMm: undefined,
              quantityValue: 1,
              markupPercentage: 15,
              workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            },
            notes: "",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
              },
            }),
            false,
            "addExpansionJointEntry",
          );

          return newEntry.id;
        },

        addValveEntry: (description, insertAtStart) => {
          const newEntry: ValveEntry = {
            id: generateUniqueId(),
            itemType: "valve",
            description: description || "New Valve",
            specs: {
              valveType: undefined,
              valveCategory: undefined,
              size: undefined,
              pressureClass: undefined,
              bodyMaterial: undefined,
              actuatorType: "manual",
              quantityValue: 1,
              markupPercentage: 15,
            },
            notes: "",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
              },
            }),
            false,
            "addValveEntry",
          );

          return newEntry.id;
        },

        addInstrumentEntry: (description, insertAtStart) => {
          const newEntry: InstrumentEntry = {
            id: generateUniqueId(),
            itemType: "instrument",
            description: description || "New Instrument",
            specs: {
              instrumentType: undefined,
              category: undefined,
              size: undefined,
              outputSignal: "4-20mA",
              quantityValue: 1,
              markupPercentage: 15,
            },
            notes: "",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
              },
            }),
            false,
            "addInstrumentEntry",
          );

          return newEntry.id;
        },

        addPumpEntry: (description, insertAtStart) => {
          const newEntry: PumpEntry = {
            id: generateUniqueId(),
            itemType: "pump",
            description: description || "New Pump",
            specs: {
              pumpType: undefined,
              pumpCategory: undefined,
              flowRate: undefined,
              totalHead: undefined,
              fluidType: "water",
              casingMaterial: undefined,
              impellerMaterial: undefined,
              motorType: "electric_ac",
              quantityValue: 1,
              markupPercentage: 15,
            },
            notes: "",
          };

          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: insertAtStart
                  ? [newEntry, ...state.rfqData.items]
                  : [...state.rfqData.items, newEntry],
              },
            }),
            false,
            "addPumpEntry",
          );

          return newEntry.id;
        },

        updateStraightPipeEntry: (id, updates) =>
          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: state.rfqData.items.map((item) => {
                  if (item.id !== id || item.itemType !== "straight_pipe") return item;
                  const mergedSpecs = updates.specs
                    ? { ...item.specs, ...updates.specs }
                    : item.specs;
                  return { ...item, ...updates, specs: mergedSpecs };
                }),
                straightPipeEntries: state.rfqData.straightPipeEntries.map((entry) => {
                  if (entry.id !== id) return entry;
                  const mergedSpecs = updates.specs
                    ? { ...entry.specs, ...updates.specs }
                    : entry.specs;
                  return { ...entry, ...updates, specs: mergedSpecs };
                }),
              },
            }),
            false,
            "updateStraightPipeEntry",
          ),

        updateItem: (id, updates) =>
          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: state.rfqData.items.map((item) => {
                  if (item.id !== id) return item;
                  const mergedSpecs = updates.specs
                    ? { ...item.specs, ...updates.specs }
                    : item.specs;
                  return { ...item, ...updates, specs: mergedSpecs } as PipeItem;
                }),
              },
            }),
            false,
            "updateItem",
          ),

        removeStraightPipeEntry: (id) =>
          set(
            (state) => ({
              rfqData: {
                ...state.rfqData,
                items: state.rfqData.items.filter((item) => item.id !== id),
                straightPipeEntries: state.rfqData.straightPipeEntries.filter(
                  (entry) => entry.id !== id,
                ),
              },
            }),
            false,
            "removeStraightPipeEntry",
          ),

        duplicateItem: (entryToDuplicate, insertAfterIndex) => {
          const newId = generateUniqueId();
          const { rfqData } = get();
          const baseItemNumber = entryToDuplicate.clientItemNumber || "";
          const existingNumbers = rfqData.items.map((e) => e.clientItemNumber || "");

          const newItemNumber = (() => {
            if (!baseItemNumber) return "";
            const numericMatch = baseItemNumber.match(/^(.+?)(\d+)$/);
            if (numericMatch) {
              const prefix = numericMatch[1];
              const currentNum = parseInt(numericMatch[2], 10);
              const numLength = numericMatch[2].length;
              const candidate = Array.from({ length: 1000 }, (_, i) => currentNum + 1 + i)
                .map((n) => `${prefix}${String(n).padStart(numLength, "0")}`)
                .find((c) => !existingNumbers.includes(c));
              return candidate || `${prefix}${String(currentNum + 1).padStart(numLength, "0")}`;
            }
            const candidate = ["", ...Array.from({ length: 100 }, (_, i) => `${i + 2}`)]
              .map((suffix) => `${baseItemNumber}-copy${suffix}`)
              .find((c) => !existingNumbers.includes(c));
            return candidate || `${baseItemNumber}-copy`;
          })();

          const duplicatedEntry = {
            ...entryToDuplicate,
            id: newId,
            clientItemNumber: newItemNumber || undefined,
            useSequentialNumbering: false,
          };

          set(
            (state) => {
              const newItems = [...state.rfqData.items];
              const insertIndex =
                insertAfterIndex !== undefined ? insertAfterIndex + 1 : newItems.length;
              newItems.splice(insertIndex, 0, duplicatedEntry);

              if (entryToDuplicate.itemType === "straight_pipe") {
                const newStraightPipeEntries = [...state.rfqData.straightPipeEntries];
                const straightPipeIndex = state.rfqData.straightPipeEntries.findIndex(
                  (e) => e.id === entryToDuplicate.id,
                );
                const insertStraightPipeIndex =
                  straightPipeIndex !== -1 ? straightPipeIndex + 1 : newStraightPipeEntries.length;
                newStraightPipeEntries.splice(
                  insertStraightPipeIndex,
                  0,
                  duplicatedEntry as StraightPipeEntry,
                );
                return {
                  rfqData: {
                    ...state.rfqData,
                    items: newItems,
                    straightPipeEntries: newStraightPipeEntries,
                  },
                };
              }

              return { rfqData: { ...state.rfqData, items: newItems } };
            },
            false,
            "duplicateItem",
          );

          return newId;
        },

        updateEntryCalculation: (id, calculation) => {
          get().updateStraightPipeEntry(id, { calculation });
        },

        totalWeight: () =>
          get().rfqData.straightPipeEntries.reduce(
            (total, entry) => total + (entry.calculation?.totalPipeWeight || 0),
            0,
          ),

        totalValue: () =>
          get().rfqData.straightPipeEntries.reduce(
            (total, entry) => total + (entry.calculation?.calculatedTotalLength || 0),
            0,
          ),

        nextStep: () =>
          set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) }), false, "nextStep"),

        prevStep: () =>
          set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) }), false, "prevStep"),

        resetForm: () =>
          set(
            {
              currentStep: 1,
              rfqData: initialRfqData(),
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
              currentDraftId: null,
              draftNumber: null,
              isSavingDraft: false,
              isLoadingDraft: false,
              showDraftRestorePrompt: false,
              pendingLocalDraft: null,
              showSaveProgressDialog: false,
              isSavingProgress: false,
              saveProgressStep: "confirm",
              hasCheckedLocalDraft: false,
              hasProcessedRecoveryToken: false,
            },
            false,
            "resetForm",
          ),

        restoreFromDraft: (draft) => {
          const formData = draft.formData || {};

          const restored: RfqFormData = {
            projectName: formData.projectName ?? "",
            projectType: formData.projectType,
            description: formData.description ?? "",
            customerName: formData.customerName ?? "",
            customerEmail: formData.customerEmail ?? "",
            customerPhone: formData.customerPhone ?? "",
            requiredDate: formData.requiredDate ?? addDaysFromNowISODate(30),
            requiredProducts: draft.requiredProducts ?? [],
            notes: formData.notes ?? "",
            latitude: formData.latitude !== undefined ? Number(formData.latitude) : undefined,
            longitude: formData.longitude !== undefined ? Number(formData.longitude) : undefined,
            siteAddress: formData.siteAddress,
            region: formData.region,
            country: formData.country,
            mineId: formData.mineId,
            mineName: formData.mineName,
            skipDocuments: formData.skipDocuments,
            useNix: formData.useNix ?? false,
            nixPopupShown: formData.nixPopupShown ?? false,
            globalSpecs: draft.globalSpecs ?? {},
            items: draft.straightPipeEntries ?? [],
            straightPipeEntries: (draft.straightPipeEntries ?? []).filter(
              (e: any) => e.itemType === "straight_pipe" || !e.itemType,
            ),
          };

          log.debug("restoreFromDraft:", JSON.stringify(restored, null, 2));

          set({ rfqData: restored }, false, "restoreFromDraft");

          if (draft.currentStep) {
            set({ currentStep: draft.currentStep }, false, "restoreFromDraft/step");
          }
        },

        setMasterData: (data) => set({ masterData: data }, false, "setMasterData"),
        setIsLoadingMasterData: (loading) =>
          set({ isLoadingMasterData: loading }, false, "setIsLoadingMasterData"),

        setAvailableSchedulesMap: (mapOrUpdater) =>
          set(
            (state) => ({
              availableSchedulesMap:
                typeof mapOrUpdater === "function"
                  ? mapOrUpdater(state.availableSchedulesMap)
                  : mapOrUpdater,
            }),
            false,
            "setAvailableSchedulesMap",
          ),

        setPressureClassesByStandard: (mapOrUpdater) =>
          set(
            (state) => ({
              pressureClassesByStandard:
                typeof mapOrUpdater === "function"
                  ? mapOrUpdater(state.pressureClassesByStandard)
                  : mapOrUpdater,
            }),
            false,
            "setPressureClassesByStandard",
          ),

        setAvailablePressureClasses: (classes) =>
          set({ availablePressureClasses: classes }, false, "setAvailablePressureClasses"),

        setBendOptionsCache: (cacheOrUpdater) =>
          set(
            (state) => ({
              bendOptionsCache:
                typeof cacheOrUpdater === "function"
                  ? cacheOrUpdater(state.bendOptionsCache)
                  : cacheOrUpdater,
            }),
            false,
            "setBendOptionsCache",
          ),

        setValidationErrors: (errors) =>
          set({ validationErrors: errors }, false, "setValidationErrors"),

        setValidationError: (field, message) =>
          set(
            (state) => {
              if (message === null) {
                const { [field]: _, ...rest } = state.validationErrors;
                return { validationErrors: rest };
              }
              return { validationErrors: { ...state.validationErrors, [field]: message } };
            },
            false,
            "setValidationError",
          ),

        setIsSubmitting: (submitting) =>
          set({ isSubmitting: submitting }, false, "setIsSubmitting"),

        addDocument: (doc) =>
          set(
            (state) => ({ pendingDocuments: [...state.pendingDocuments, doc] }),
            false,
            "addDocument",
          ),

        removeDocument: (id) =>
          set(
            (state) => ({
              pendingDocuments: state.pendingDocuments.filter((doc) => doc.id !== id),
            }),
            false,
            "removeDocument",
          ),

        setPendingDocuments: (docs) =>
          set({ pendingDocuments: docs }, false, "setPendingDocuments"),

        addTenderDocument: (doc) =>
          set(
            (state) => ({ pendingTenderDocuments: [...state.pendingTenderDocuments, doc] }),
            false,
            "addTenderDocument",
          ),

        removeTenderDocument: (id) =>
          set(
            (state) => ({
              pendingTenderDocuments: state.pendingTenderDocuments.filter((doc) => doc.id !== id),
            }),
            false,
            "removeTenderDocument",
          ),

        setPendingTenderDocuments: (docs) =>
          set({ pendingTenderDocuments: docs }, false, "setPendingTenderDocuments"),

        setShowCloseConfirmation: (show) =>
          set({ showCloseConfirmation: show }, false, "setShowCloseConfirmation"),

        nixShowPopup: () => {
          set({ showNixPopup: true }, false, "nixShowPopup");
        },

        nixAccept: () => {
          const { updateRfqField } = get();
          updateRfqField("useNix", true);
          updateRfqField("requiredProducts", ["fabricated_steel"]);
          set({ showNixPopup: false, nixChatPanelVisible: true }, false, "nixAccept");
        },

        nixDecline: () => {
          const { updateRfqField } = get();
          updateRfqField("useNix", false);
          set({ showNixPopup: false }, false, "nixDecline");
        },

        nixStopUsing: () => {
          const { updateRfqField } = get();
          updateRfqField("useNix", false);
          updateRfqField("nixPopupShown", false);
        },

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

        nixSetChatSessionId: (sessionId: number | null) =>
          set({ nixChatSessionId: sessionId }, false, "nixSetChatSessionId"),

        nixSetChatPanelGeometry: (geometry: {
          x: number;
          y: number;
          width: number;
          height: number;
        }) => set({ nixChatPanelGeometry: geometry }, false, "nixSetChatPanelGeometry"),

        nixCloseClarification: () =>
          set({ showNixClarification: false }, false, "nixCloseClarification"),

        nixItemsPageReady: (showToast) => {
          const { isNixProcessing, pendingDocuments } = get();
          if (isNixProcessing && pendingDocuments.length > 0) {
            set(
              { nixProcessingProgress: 100, nixProcessingStatus: "Complete!" },
              false,
              "nixItemsPageReady/progress",
            );
            setTimeout(() => {
              set({ isNixProcessing: false }, false, "nixItemsPageReady/done");
              showToast(
                `Nix processed ${pendingDocuments.length} document(s) successfully!`,
                "success",
              );
            }, 300);
          }
        },

        nixProcessDocuments: async (showToast) => {
          const { pendingDocuments, rfqData, updateRfqField, setCurrentStep } = get();

          if (!pendingDocuments || pendingDocuments.length === 0) {
            log.warn("No documents to process with Nix");
            return;
          }

          set(
            {
              isNixProcessing: true,
              nixProcessingProgress: 0,
              nixProcessingStatus: "Uploading document...",
              nixProcessingTimeRemaining: 15,
            },
            false,
            "nixProcessDocuments/start",
          );
          log.debug(`Processing ${pendingDocuments.length} document(s) with Nix...`);

          const startTime = nowMillis();
          const allClarifications: NixClarificationDto[] = [];

          try {
            for (let i = 0; i < pendingDocuments.length; i++) {
              const doc = pendingDocuments[i];
              const docProgress = (i / pendingDocuments.length) * 100;

              set(
                {
                  nixProcessingProgress: docProgress + 5,
                  nixProcessingStatus: `Uploading ${doc.file.name}...`,
                  nixProcessingTimeRemaining: 12,
                },
                false,
                "nixProcessDocuments/upload",
              );

              log.debug(
                `Processing document: ${doc.file.name}, size: ${doc.file.size} bytes, type: ${doc.file.type}`,
              );

              set(
                {
                  nixProcessingProgress: docProgress + 15,
                  nixProcessingStatus: "Reading document structure...",
                  nixProcessingTimeRemaining: 10,
                },
                false,
                "nixProcessDocuments/reading",
              );

              const result = await nixApi.uploadAndProcess(doc.file);

              set(
                {
                  nixProcessingProgress: docProgress + 40,
                  nixProcessingStatus: "Extracting pipe specifications...",
                  nixProcessingTimeRemaining: 7,
                },
                false,
                "nixProcessDocuments/extracting",
              );

              log.debug("Nix extraction result:", result);
              set(
                { nixExtractionId: result.extractionId },
                false,
                "nixProcessDocuments/extractionId",
              );

              set(
                {
                  nixProcessingProgress: docProgress + 60,
                  nixProcessingStatus: "Analyzing line items...",
                  nixProcessingTimeRemaining: 5,
                },
                false,
                "nixProcessDocuments/analyzing",
              );

              if (result.items && result.items.length > 0) {
                set({ nixExtractedItems: result.items }, false, "nixProcessDocuments/items");
                log.debug(`Extracted ${result.items.length} items`);

                set(
                  {
                    nixProcessingProgress: docProgress + 70,
                    nixProcessingStatus: `Found ${result.items.length} items, populating RFQ...`,
                    nixProcessingTimeRemaining: 5,
                  },
                  false,
                  "nixProcessDocuments/populating",
                );

                await new Promise((resolve) => setTimeout(resolve, 300));

                const totalItems = result.items.length;
                for (let itemIdx = 0; itemIdx < totalItems; itemIdx++) {
                  const itemProgress = docProgress + 70 + (itemIdx / totalItems) * 20;
                  set(
                    {
                      nixProcessingProgress: itemProgress,
                      nixProcessingStatus: `Adding item ${itemIdx + 1} of ${totalItems}...`,
                      nixProcessingTimeRemaining: Math.max(
                        1,
                        Math.ceil((totalItems - itemIdx) * 0.3),
                      ),
                    },
                    false,
                    "nixProcessDocuments/addingItem",
                  );

                  await new Promise((resolve) => setTimeout(resolve, 100));
                }

                convertNixItemsToRfqItems(result.items);

                set(
                  {
                    nixProcessingProgress: docProgress + 92,
                    nixProcessingStatus: "Items added to RFQ",
                    nixProcessingTimeRemaining: 2,
                  },
                  false,
                  "nixProcessDocuments/itemsAdded",
                );
              }

              set(
                {
                  nixProcessingProgress: docProgress + 85,
                  nixProcessingStatus: "Preparing clarification questions...",
                  nixProcessingTimeRemaining: 2,
                },
                false,
                "nixProcessDocuments/clarifications",
              );

              if (result.pendingClarifications && result.pendingClarifications.length > 0) {
                allClarifications.push(...result.pendingClarifications);
                log.debug(`${result.pendingClarifications.length} clarification(s) needed`);
              }

              if (result.metadata) {
                const currentRfqData = get().rfqData;
                if (result.metadata.projectLocation && !currentRfqData.siteAddress) {
                  get().updateRfqField("siteAddress", result.metadata.projectLocation);
                  log.debug(`Auto-populated location: ${result.metadata.projectLocation}`);
                }
                if (result.metadata.projectName && !currentRfqData.projectName) {
                  get().updateRfqField("projectName", result.metadata.projectName);
                  log.debug(`Auto-populated project name: ${result.metadata.projectName}`);
                }
              }
            }

            set(
              {
                nixProcessingProgress: 95,
                nixProcessingStatus: "Finalizing RFQ...",
                nixProcessingTimeRemaining: 1,
              },
              false,
              "nixProcessDocuments/finalizing",
            );

            await new Promise((resolve) => setTimeout(resolve, 400));

            const processingTime = ((nowMillis() - startTime) / 1000).toFixed(1);
            log.debug(`Nix processing completed in ${processingTime}s`);

            if (allClarifications.length > 0) {
              set(
                {
                  nixProcessingProgress: 100,
                  nixProcessingStatus: "Complete! Questions needed...",
                  nixProcessingTimeRemaining: 0,
                },
                false,
                "nixProcessDocuments/questionsNeeded",
              );
              await new Promise((resolve) => setTimeout(resolve, 500));
              set(
                {
                  isNixProcessing: false,
                  nixClarifications: allClarifications,
                  currentClarificationIndex: 0,
                  showNixClarification: true,
                },
                false,
                "nixProcessDocuments/showClarifications",
              );
            } else {
              set(
                {
                  nixProcessingProgress: 98,
                  nixProcessingStatus: "Loading Items page...",
                  nixProcessingTimeRemaining: 0,
                },
                false,
                "nixProcessDocuments/loadingItems",
              );
              setCurrentStep(2);

              setTimeout(() => {
                const { isNixProcessing: stillProcessing } = get();
                if (stillProcessing) {
                  set(
                    {
                      isNixProcessing: false,
                      nixProcessingProgress: 100,
                      nixProcessingStatus: "Complete!",
                    },
                    false,
                    "nixProcessDocuments/complete",
                  );
                  showToast(
                    `Nix processed ${pendingDocuments.length} document(s) successfully!`,
                    "success",
                  );
                }
              }, 3000);
            }
          } catch (error) {
            log.error("Nix processing error:", error);
            showToast(
              `Nix processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              "error",
            );
            set(
              { isNixProcessing: false, nixProcessingProgress: 0 },
              false,
              "nixProcessDocuments/error",
            );
          }
        },

        nixSubmitClarification: async (clarificationId, response, showToast) => {
          const { currentClarificationIndex, nixClarifications, setCurrentStep } = get();
          const isLastQuestion = currentClarificationIndex >= nixClarifications.length - 1;
          log.debug(
            `Submitting clarification ${clarificationId}, index ${currentClarificationIndex} of ${nixClarifications.length}, isLast: ${isLastQuestion}`,
          );

          try {
            const result = await nixApi.submitClarification(clarificationId, response, true);
            log.debug("Clarification submitted:", result);
          } catch (error) {
            log.error("Failed to submit clarification:", error);
            log.error("Clarification submit error:", error);
          }

          if (!isLastQuestion) {
            set(
              (state) => ({ currentClarificationIndex: state.currentClarificationIndex + 1 }),
              false,
              "nixSubmitClarification/next",
            );
          } else {
            log.debug("Closing clarification popup and returning to step 1");
            set({ showNixClarification: false }, false, "nixSubmitClarification/done");
            setCurrentStep(1);
            showToast(
              "All clarifications completed! Please confirm the project location before continuing.",
              "success",
            );
          }
        },

        nixSkipClarification: async (clarificationId, showToast) => {
          const { currentClarificationIndex, nixClarifications, setCurrentStep } = get();

          try {
            await nixApi.skipClarification(clarificationId);
            log.debug("Clarification skipped");

            if (currentClarificationIndex < nixClarifications.length - 1) {
              set(
                (state) => ({ currentClarificationIndex: state.currentClarificationIndex + 1 }),
                false,
                "nixSkipClarification/next",
              );
            } else {
              set({ showNixClarification: false }, false, "nixSkipClarification/done");
              setCurrentStep(1);
              showToast(
                "Clarifications skipped. Please complete the project details and continue.",
                "info",
              );
            }
          } catch (error) {
            log.error("Failed to skip clarification:", error);
          }
        },

        setCurrentDraftId: (id) => set({ currentDraftId: id }, false, "setCurrentDraftId"),
        setDraftNumber: (number) => set({ draftNumber: number }, false, "setDraftNumber"),
        setIsSavingDraft: (saving) => set({ isSavingDraft: saving }, false, "setIsSavingDraft"),
        setIsLoadingDraft: (loading) =>
          set({ isLoadingDraft: loading }, false, "setIsLoadingDraft"),
        setShowDraftRestorePrompt: (show) =>
          set({ showDraftRestorePrompt: show }, false, "setShowDraftRestorePrompt"),
        setPendingLocalDraft: (draft) =>
          set({ pendingLocalDraft: draft }, false, "setPendingLocalDraft"),
        setHasCheckedLocalDraft: (checked) =>
          set({ hasCheckedLocalDraft: checked }, false, "setHasCheckedLocalDraft"),
        setHasProcessedRecoveryToken: (processed) =>
          set({ hasProcessedRecoveryToken: processed }, false, "setHasProcessedRecoveryToken"),

        draftOpenSaveProgressDialog: () =>
          set(
            { saveProgressStep: "confirm", showSaveProgressDialog: true },
            false,
            "draftOpenSaveProgressDialog",
          ),

        draftCloseSaveProgressDialog: () =>
          set(
            { showSaveProgressDialog: false, saveProgressStep: "confirm" },
            false,
            "draftCloseSaveProgressDialog",
          ),

        draftSaveProgressToServer: async (showToast) => {
          const { rfqData, currentStep } = get();

          if (!rfqData.customerEmail) {
            showToast("Please enter your email address to save progress", "error");
            return;
          }

          set({ isSavingProgress: true }, false, "draftSaveProgressToServer/start");
          try {
            await anonymousDraftsApi.save({
              customerEmail: rfqData.customerEmail,
              projectName: rfqData.projectName,
              currentStep,
              formData: buildDraftFormData(),
              globalSpecs: rfqData.globalSpecs,
              requiredProducts: rfqData.requiredProducts,
              entries: rfqData.items,
            });

            await anonymousDraftsApi.requestRecoveryEmail(rfqData.customerEmail);

            set({ saveProgressStep: "success" }, false, "draftSaveProgressToServer/success");
            log.debug("Progress saved and recovery email sent to:", rfqData.customerEmail);
          } catch (error) {
            log.error("Failed to save progress:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            if (errorMessage === "Backend unavailable") {
              showToast(
                "Server unavailable. Your progress is saved locally on this browser.",
                "warning",
              );
            } else {
              showToast("Failed to save progress. Your data is still saved locally.", "error");
            }
            set({ showSaveProgressDialog: false }, false, "draftSaveProgressToServer/error");
          } finally {
            set({ isSavingProgress: false }, false, "draftSaveProgressToServer/done");
          }
        },

        draftSaveAndSendRecoveryEmail: async (isAuthenticated) => {
          const { rfqData, currentStep } = get();

          if (isAuthenticated) return;
          if (!rfqData.customerEmail) return;

          try {
            await anonymousDraftsApi.save({
              customerEmail: rfqData.customerEmail,
              projectName: rfqData.projectName,
              currentStep,
              formData: buildDraftFormData(),
              globalSpecs: rfqData.globalSpecs,
              requiredProducts: rfqData.requiredProducts,
              entries: rfqData.items,
            });

            await anonymousDraftsApi.requestRecoveryEmail(rfqData.customerEmail);
            log.debug("Background save and recovery email sent");
          } catch (error) {
            log.warn("Background save failed:", error);
          }
        },
      };
    },
    { name: "rfq-wizard" },
  ),
);
