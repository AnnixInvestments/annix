import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PipeDimension } from "@/app/lib/api/client";

export interface ScheduleData {
  id: number;
  scheduleDesignation?: string;
  scheduleNumber?: number;
  wallThicknessMm: number;
  massKgm?: number;
  internalDiameterMm?: number;
  nominalOutsideDiameter?: PipeDimension["nominalOutsideDiameter"];
  steelSpecification?: PipeDimension["steelSpecification"];
}

interface PressureClassOption {
  id: number;
  designation: string;
}

interface BendOptions {
  nominalBores: number[];
  degrees: number[];
}

interface RfqUiState {
  availableSchedulesMap: Record<string, ScheduleData[]>;
  pressureClassesByStandard: Record<number, PressureClassOption[]>;
  availablePressureClasses: PressureClassOption[];
  bendOptionsCache: Record<string, BendOptions>;

  validationErrors: Record<string, string>;
  isSubmitting: boolean;
  showCloseConfirmation: boolean;
}

interface RfqUiActions {
  setAvailableSchedulesMap: (
    mapOrUpdater:
      | Record<string, ScheduleData[]>
      | ((prev: Record<string, ScheduleData[]>) => Record<string, ScheduleData[]>),
  ) => void;
  setPressureClassesByStandard: (
    mapOrUpdater:
      | Record<number, PressureClassOption[]>
      | ((prev: Record<number, PressureClassOption[]>) => Record<number, PressureClassOption[]>),
  ) => void;
  setAvailablePressureClasses: (classes: PressureClassOption[]) => void;
  setBendOptionsCache: (
    cacheOrUpdater:
      | Record<string, BendOptions>
      | ((prev: Record<string, BendOptions>) => Record<string, BendOptions>),
  ) => void;

  setValidationErrors: (errors: Record<string, string>) => void;
  setValidationError: (field: string, message: string | null) => void;
  clearValidationErrors: () => void;
  setIsSubmitting: (submitting: boolean) => void;
  setShowCloseConfirmation: (show: boolean) => void;

  uiReset: () => void;
}

export type RfqUiStore = RfqUiState & RfqUiActions;

const initialUiState: RfqUiState = {
  availableSchedulesMap: {},
  pressureClassesByStandard: {},
  availablePressureClasses: [],
  bendOptionsCache: {},

  validationErrors: {},
  isSubmitting: false,
  showCloseConfirmation: false,
};

export const useRfqUiStore = create<RfqUiStore>()(
  devtools(
    (set) => ({
      ...initialUiState,

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

      clearValidationErrors: () => set({ validationErrors: {} }, false, "clearValidationErrors"),

      setIsSubmitting: (submitting) => set({ isSubmitting: submitting }, false, "setIsSubmitting"),

      setShowCloseConfirmation: (show) =>
        set({ showCloseConfirmation: show }, false, "setShowCloseConfirmation"),

      uiReset: () => set(initialUiState, false, "uiReset"),
    }),
    { name: "rfq-ui-store" },
  ),
);
