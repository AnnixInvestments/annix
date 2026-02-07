"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { anonymousDraftsApi, draftsApi } from "@/app/lib/api/client";
import { useRfqDraftStorage } from "@/app/lib/hooks/useRfqDraftStorage";
import type { GlobalSpecs, PipeItem, RfqFormData } from "@/app/lib/hooks/useRfqForm";
import { log } from "@/app/lib/logger";

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

export interface UseDraftManagementProps {
  rfqData: RfqFormData;
  currentStep: number;
  isAuthenticated: boolean;
  restoreFromDraft: (data: {
    formData: Partial<RfqFormData>;
    globalSpecs?: GlobalSpecs;
    requiredProducts?: string[];
    straightPipeEntries?: PipeItem[];
    currentStep?: number;
  }) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export interface UseDraftManagementReturn {
  currentDraftId: number | null;
  draftNumber: string | null;
  isSavingDraft: boolean;
  isLoadingDraft: boolean;
  showDraftRestorePrompt: boolean;
  pendingLocalDraft: any;
  showSaveProgressDialog: boolean;
  isSavingProgress: boolean;
  saveProgressStep: "confirm" | "success";
  initialDraftDataRef: React.MutableRefObject<string | null>;
  localDraftLastSaved: Date | null;
  localDraftEmail: string | null;

  setCurrentDraftId: (id: number | null) => void;
  setDraftNumber: (number: string | null) => void;
  setIsSavingDraft: (saving: boolean) => void;
  setIsLoadingDraft: (loading: boolean) => void;

  handleRestoreLocalDraft: () => void;
  handleDiscardLocalDraft: () => void;
  handleSaveProgressToServer: () => Promise<void>;
  handleOpenSaveProgressDialog: () => void;
  handleCloseSaveProgressDialog: () => void;
  saveAndSendRecoveryEmailInBackground: () => Promise<void>;
  saveLocalDraft: (data: any) => void;
  loadLocalDraft: () => any;
  clearLocalDraft: () => void;
  hasLocalDraft: boolean;
  hasCheckedLocalDraftRef: React.MutableRefObject<boolean>;
  hasProcessedRecoveryTokenRef: React.MutableRefObject<boolean>;
  setShowDraftRestorePrompt: (show: boolean) => void;
  setPendingLocalDraft: (draft: any) => void;
}

export function useDraftManagement({
  rfqData,
  currentStep,
  isAuthenticated,
  restoreFromDraft,
  showToast,
}: UseDraftManagementProps): UseDraftManagementReturn {
  const searchParams = useSearchParams();
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [draftNumber, setDraftNumber] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const initialDraftDataRef = useRef<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  const {
    loadDraft: loadLocalDraft,
    saveDraft: saveLocalDraft,
    clearDraft: clearLocalDraft,
    hasDraft: hasLocalDraft,
    lastSaved: localDraftLastSaved,
    draftEmail: localDraftEmail,
  } = useRfqDraftStorage();

  const [showDraftRestorePrompt, setShowDraftRestorePrompt] = useState(false);
  const [pendingLocalDraft, setPendingLocalDraft] = useState<any>(null);
  const hasCheckedLocalDraft = useRef(false);
  const hasProcessedRecoveryToken = useRef(false);

  const [showSaveProgressDialog, setShowSaveProgressDialog] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressStep, setSaveProgressStep] = useState<"confirm" | "success">("confirm");

  useEffect(() => {
    const draftId = searchParams?.get("draft") || searchParams?.get("draftId");
    if (!draftId) return;

    log.debug("Draft parameter detected:", draftId);

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const draft = await draftsApi.getById(parseInt(draftId, 10));
        log.debug("Loading draft:", draft);

        restoreFromDraft({
          formData: draft.formData,
          globalSpecs: draft.globalSpecs as GlobalSpecs | undefined,
          requiredProducts: draft.requiredProducts,
          straightPipeEntries: draft.straightPipeEntries as PipeItem[] | undefined,
          currentStep: draft.currentStep,
        });

        setCurrentDraftId(draft.id);
        setDraftNumber(draft.draftNumber);

        log.debug(`Loaded draft ${draft.draftNumber}`);
      } catch (error) {
        log.error("Failed to load draft:", error);
        showToast("Failed to load the saved draft. Starting with a new form.", "error");
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [searchParams, restoreFromDraft, showToast]);

  const handleRestoreLocalDraft = useCallback(() => {
    if (!pendingLocalDraft) return;

    log.debug("Restoring localStorage draft:", pendingLocalDraft);

    restoreFromDraft({
      formData: pendingLocalDraft.rfqData,
      globalSpecs: pendingLocalDraft.globalSpecs,
      requiredProducts: pendingLocalDraft.rfqData?.requiredProducts,
      straightPipeEntries: pendingLocalDraft.entries,
      currentStep: pendingLocalDraft.currentStep,
    });

    setShowDraftRestorePrompt(false);
    setPendingLocalDraft(null);
    showToast("Draft restored successfully", "success");
  }, [pendingLocalDraft, restoreFromDraft, showToast]);

  const handleDiscardLocalDraft = useCallback(() => {
    clearLocalDraft();
    setShowDraftRestorePrompt(false);
    setPendingLocalDraft(null);
    showToast("Starting fresh", "info");
  }, [clearLocalDraft, showToast]);

  const handleSaveProgressToServer = useCallback(async () => {
    if (!rfqData.customerEmail) {
      showToast("Please enter your email address to save progress", "error");
      return;
    }

    setIsSavingProgress(true);
    try {
      await anonymousDraftsApi.save({
        customerEmail: rfqData.customerEmail,
        projectName: rfqData.projectName,
        currentStep,
        formData: {
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
        },
        globalSpecs: rfqData.globalSpecs,
        requiredProducts: rfqData.requiredProducts,
        entries: rfqData.items,
      });

      await anonymousDraftsApi.requestRecoveryEmail(rfqData.customerEmail);

      setSaveProgressStep("success");
      log.debug("Progress saved and recovery email sent to:", rfqData.customerEmail);
    } catch (error) {
      log.error("Failed to save progress:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage === "Backend unavailable") {
        showToast("Server unavailable. Your progress is saved locally on this browser.", "warning");
      } else {
        showToast("Failed to save progress. Your data is still saved locally.", "error");
      }
      setShowSaveProgressDialog(false);
    } finally {
      setIsSavingProgress(false);
    }
  }, [rfqData, currentStep, showToast]);

  const handleOpenSaveProgressDialog = useCallback(() => {
    setSaveProgressStep("confirm");
    setShowSaveProgressDialog(true);
  }, []);

  const handleCloseSaveProgressDialog = useCallback(() => {
    setShowSaveProgressDialog(false);
    setSaveProgressStep("confirm");
  }, []);

  const saveAndSendRecoveryEmailInBackground = useCallback(async () => {
    if (isAuthenticated) return;
    if (!rfqData.customerEmail) return;

    try {
      await anonymousDraftsApi.save({
        customerEmail: rfqData.customerEmail,
        projectName: rfqData.projectName,
        currentStep,
        formData: {
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
        },
        globalSpecs: rfqData.globalSpecs,
        requiredProducts: rfqData.requiredProducts,
        entries: rfqData.items,
      });

      await anonymousDraftsApi.requestRecoveryEmail(rfqData.customerEmail);
      log.debug("Background save and recovery email sent");
    } catch (error) {
      log.warn("Background save failed:", error);
    }
  }, [isAuthenticated, rfqData, currentStep]);

  return {
    currentDraftId,
    draftNumber,
    isSavingDraft,
    isLoadingDraft,
    showDraftRestorePrompt,
    pendingLocalDraft,
    showSaveProgressDialog,
    isSavingProgress,
    saveProgressStep,
    initialDraftDataRef,
    localDraftLastSaved,
    localDraftEmail,

    setCurrentDraftId,
    setDraftNumber,
    setIsSavingDraft,
    setIsLoadingDraft,

    handleRestoreLocalDraft,
    handleDiscardLocalDraft,
    handleSaveProgressToServer,
    handleOpenSaveProgressDialog,
    handleCloseSaveProgressDialog,
    saveAndSendRecoveryEmailInBackground,
    saveLocalDraft,
    loadLocalDraft,
    clearLocalDraft,
    hasLocalDraft,
    hasCheckedLocalDraftRef: hasCheckedLocalDraft,
    hasProcessedRecoveryTokenRef: hasProcessedRecoveryToken,
    setShowDraftRestorePrompt,
    setPendingLocalDraft,
  };
}
