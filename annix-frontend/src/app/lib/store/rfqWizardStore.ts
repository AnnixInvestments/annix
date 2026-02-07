import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CreateStraightPipeRfqDto, StraightPipeCalculationResult } from "@/app/lib/api/client";
import { addDaysFromNowISODate, generateUniqueId } from "@/app/lib/datetime";
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

export interface PendingDocument {
  file: File;
  id: string;
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
}

export type RfqWizardStore = RfqWizardState & RfqWizardActions;

export const useRfqWizardStore = create<RfqWizardStore>()(
  devtools(
    (set, get) => ({
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

      resetForm: () => set({ currentStep: 1, rfqData: initialRfqData() }, false, "resetForm"),

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

      setIsSubmitting: (submitting) => set({ isSubmitting: submitting }, false, "setIsSubmitting"),

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

      setPendingDocuments: (docs) => set({ pendingDocuments: docs }, false, "setPendingDocuments"),

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
    }),
    { name: "rfq-wizard" },
  ),
);
