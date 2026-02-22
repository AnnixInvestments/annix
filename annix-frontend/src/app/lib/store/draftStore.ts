import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface DraftState {
  currentDraftId: number | null;
  draftNumber: string | null;
  isSavingDraft: boolean;
  isLoadingDraft: boolean;
  showDraftRestorePrompt: boolean;
  pendingLocalDraft: unknown;
  showSaveProgressDialog: boolean;
  isSavingProgress: boolean;
  saveProgressStep: "confirm" | "success";
  hasCheckedLocalDraft: boolean;
  hasProcessedRecoveryToken: boolean;
}

interface DraftActions {
  setCurrentDraftId: (id: number | null) => void;
  setDraftNumber: (number: string | null) => void;
  setIsSavingDraft: (saving: boolean) => void;
  setIsLoadingDraft: (loading: boolean) => void;
  setShowDraftRestorePrompt: (show: boolean) => void;
  setPendingLocalDraft: (draft: unknown) => void;
  setHasCheckedLocalDraft: (checked: boolean) => void;
  setHasProcessedRecoveryToken: (processed: boolean) => void;
  draftOpenSaveProgressDialog: () => void;
  draftCloseSaveProgressDialog: () => void;
  setIsSavingProgress: (saving: boolean) => void;
  setSaveProgressStep: (step: "confirm" | "success") => void;
  draftReset: () => void;
}

export type DraftStore = DraftState & DraftActions;

const initialDraftState: DraftState = {
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
};

export const useDraftStore = create<DraftStore>()(
  devtools(
    (set) => ({
      ...initialDraftState,

      setCurrentDraftId: (id) => set({ currentDraftId: id }, false, "setCurrentDraftId"),

      setDraftNumber: (number) => set({ draftNumber: number }, false, "setDraftNumber"),

      setIsSavingDraft: (saving) => set({ isSavingDraft: saving }, false, "setIsSavingDraft"),

      setIsLoadingDraft: (loading) => set({ isLoadingDraft: loading }, false, "setIsLoadingDraft"),

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

      setIsSavingProgress: (saving) =>
        set({ isSavingProgress: saving }, false, "setIsSavingProgress"),

      setSaveProgressStep: (step) => set({ saveProgressStep: step }, false, "setSaveProgressStep"),

      draftReset: () => set(initialDraftState, false, "draftReset"),
    }),
    { name: "draft-store" },
  ),
);
