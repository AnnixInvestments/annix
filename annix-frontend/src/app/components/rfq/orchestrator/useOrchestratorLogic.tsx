"use client";
import { keys } from "es-toolkit/compat";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getFlangeMaterialGroup } from "@/app/components/rfq/utils";
import { useToast } from "@/app/components/Toast";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { draftsApi, masterDataApi } from "@/app/lib/api/client";
import {
  DEFAULT_PIPE_LENGTH_M,
  physicalFlangeCount as getPhysicalFlangeCount,
  scheduleListForSpec,
} from "@/app/lib/config/rfq";
import { fromISO } from "@/app/lib/datetime";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import { useRfqDraftStorage } from "@/app/lib/hooks/useRfqDraftStorage";
import type { StraightPipeEntry } from "@/app/lib/hooks/useRfqForm";
import { log } from "@/app/lib/logger";
import {
  flangeWeight as flangeWeightLookup,
  hasFlangeWeightRecord,
  useAllBnwSetWeights,
  useAllFlangeTypeWeights,
  useAllGasketWeights,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { toNumericDraftId } from "./draft-id";
import { calculateLocalPipeResult, getPressureClassWithFlangeType } from "./local-pipe-calc";
import { useOrchestratorActions } from "./useOrchestratorActions";
import { usePressureClassSelection } from "./usePressureClassSelection";

export interface Props {
  onSuccess: (rfqId: string) => void;
  onCancel: () => void;
  editRfqId?: number;
}

// Modal shown while an RFQ submission is in flight. Counts elapsed
// seconds locally so the user can see the request is still alive
// even though the backend's per-item loop offers no streaming
// progress signal. Pure local state — mounted/unmounted purely by
// the `visible` prop so the timer resets cleanly between attempts.
export function SubmissionProgressPopup(props: { visible: boolean; itemCount: number }) {
  const { visible, itemCount } = props;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!visible) {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const mm = Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (elapsedSeconds % 60).toString().padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-6">
          <svg
            className="w-12 h-12 animate-spin text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Submitting RFQ</h2>
        <p className="text-sm text-gray-600 text-center mb-4">
          Processing {itemCount.toLocaleString()} item{itemCount === 1 ? "" : "s"}. Large bills of
          quantities can take several minutes — please keep this tab open.
        </p>
        <div className="bg-gray-50 rounded p-3 text-center">
          <div className="text-xs uppercase tracking-wide text-gray-500">Elapsed</div>
          <div className="text-2xl font-mono font-semibold text-gray-900 mt-1">
            {mm}:{ss}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOrchestratorLogic(props: Props) {
  const { onSuccess, onCancel, editRfqId } = props;
  const isEditing = editRfqId !== undefined;
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const {
    currentStep,
    setCurrentStep,
    rfqData,
    updateRfqField,
    applyAutoGlobalSpecs,
    markRfqEdited,
    userHasEdited,
    addStraightPipeEntry,
    addBendEntry,
    addFittingEntry,
    addPipeSteelWorkEntry,
    addExpansionJointEntry,
    addValveEntry,
    addInstrumentEntry,
    addPumpEntry,
    updateStraightPipeEntry,
    updateItem,
    removeStraightPipeEntry,
    duplicateItem,
    updateEntryCalculation,
    totalWeight: getTotalWeight,
    totalValue: getTotalValue,
    nextStep: originalNextStep,
    prevStep,
    restoreFromDraft,
    masterData,
    setMasterData,
    isLoadingMasterData,
    setIsLoadingMasterData,
    isSubmitting,
    setIsSubmitting,
    validationErrors,
    setValidationErrors,
    availableSchedulesMap,
    setAvailableSchedulesMap,
    availablePressureClasses,
    setAvailablePressureClasses,
    pressureClassesByStandard,
    setPressureClassesByStandard,
    pendingDocuments,
    setPendingDocuments,
    pendingTenderDocuments,
    setPendingTenderDocuments,
    showCloseConfirmation,
    setShowCloseConfirmation,
    showNixPopup,
    isNixProcessing,
    nixProcessingProgress,
    nixProcessingStatus,
    nixProcessingTimeRemaining,
    nixExtractionId,
    nixExtractedItems,
    nixClarifications,
    currentClarificationIndex,
    showNixClarification,
    nixShowPopup,
    nixAccept,
    nixDecline,
    nixStopUsing,
    nixCloseClarification,
    nixProcessDocuments,
    nixSubmitClarification,
    nixSubmitClarificationBatch,
    nixSkipClarification,
    nixItemsPageReady,
    nixChatSessionId,
    nixChatPanelVisible,
    nixChatPanelGeometry,
    nixOpenChatPanel,
    nixCloseChatPanel,
    nixSetChatSessionId,
    nixSetChatPanelGeometry,
    nixGuidedModeActive,
    nixFormHelperMinimized,
    nixFormHelperReactivate,
    currentDraftId,
    draftNumber,
    isSavingDraft,
    isLoadingDraft,
    showDraftRestorePrompt,
    pendingLocalDraft,
    showSaveProgressDialog,
    isSavingProgress,
    saveProgressStep,
    hasCheckedLocalDraft,
    hasProcessedRecoveryToken,
    setCurrentDraftId,
    setDraftNumber,
    setIsSavingDraft,
    setIsLoadingDraft,
    setShowDraftRestorePrompt,
    setPendingLocalDraft,
    setHasCheckedLocalDraft,
    setHasProcessedRecoveryToken,
    draftOpenSaveProgressDialog,
    draftCloseSaveProgressDialog,
    draftSaveProgressToServer,
    draftSaveAndSendRecoveryEmail,
  } = useRfqWizardStore();

  const rfqDataRef = useRef(rfqData);
  rfqDataRef.current = rfqData;

  const { isAuthenticated, isLoading: isAuthLoading } = useOptionalCustomerAuth();
  const router = useRouter();

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  // Count of items being submitted — set at the top of handleSubmit
  // so the progress popup can show "Processing N items" instead of
  // a bare spinner. Large BOQs can take minutes to process serially
  // on the backend, and the popup is what tells the user it's still
  // alive vs. hung.
  const [submissionItemCount, setSubmissionItemCount] = useState<number>(0);
  // RFQ id this draft was already converted into, if any. Set when a
  // converted draft is loaded — drives the "Re-send BOQ to Suppliers"
  // recovery button so a BOQ-distribution failure can be retried
  // without spawning a duplicate RFQ.
  const [convertedRfqId, setConvertedRfqId] = useState<number | null>(null);

  const {
    loadDraft: loadLocalDraft,
    saveDraft: saveLocalDraft,
    clearDraft: clearLocalDraft,
    hasDraft: hasLocalDraft,
    lastSaved: localDraftLastSaved,
    draftEmail: localDraftEmail,
    isFreshDraft: isLocalDraftFresh,
  } = useRfqDraftStorage();

  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allBnw = [] } = useAllBnwSetWeights();
  const { data: allGaskets = [] } = useAllGasketWeights();

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
    // Rehydrate server attachment so the restored draft keeps
    // updating its existing row.
    const pendingDraftId = toNumericDraftId(pendingLocalDraft.draftId);
    if (pendingDraftId) setCurrentDraftId(pendingDraftId);
    if (pendingLocalDraft.draftNumber) setDraftNumber(pendingLocalDraft.draftNumber);

    setShowDraftRestorePrompt(false);
    setPendingLocalDraft(null);
    showToast("Draft restored successfully", "success");
  }, [
    pendingLocalDraft,
    restoreFromDraft,
    setCurrentDraftId,
    setDraftNumber,
    showToast,
    setShowDraftRestorePrompt,
    setPendingLocalDraft,
  ]);

  const handleDiscardLocalDraft = useCallback(() => {
    clearLocalDraft();
    setShowDraftRestorePrompt(false);
    setPendingLocalDraft(null);
    showToast("Starting fresh", "info");
  }, [clearLocalDraft, showToast, setShowDraftRestorePrompt, setPendingLocalDraft]);

  // Get filtered pressure classes for a specific standard (with caching)
  const getFilteredPressureClasses = useCallback(
    async (standardId: number): Promise<any[]> => {
      if (!standardId) return [];

      // Return cached if available
      if (pressureClassesByStandard[standardId]) {
        return pressureClassesByStandard[standardId];
      }

      try {
        const classes = await masterDataApi.getFlangePressureClassesByStandard(standardId);
        setPressureClassesByStandard((prev) => ({ ...prev, [standardId]: classes }));
        return classes;
      } catch (error) {
        log.error("Error fetching pressure classes for standard", standardId, error);
        return [];
      }
    },
    [pressureClassesByStandard],
  );

  // Load master data from API
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setIsLoadingMasterData(true);
        const { masterDataApi } = await import("@/app/lib/api/client");

        const [steelSpecs, flangeStandards, pressureClasses, nominalBores, flangeTypes] =
          await Promise.all([
            masterDataApi.getSteelSpecifications(),
            masterDataApi.getFlangeStandards(),
            masterDataApi.getFlangePressureClasses(),
            masterDataApi.getNominalBores(),
            masterDataApi.getFlangeTypes(),
          ]);

        setMasterData({
          steelSpecs,
          flangeStandards,
          pressureClasses,
          nominalBores,
          flangeTypes,
        });
      } catch (error) {
        // Silently handle backend unavailable - use fallback data
        if (error instanceof Error && error.message !== "Backend unavailable") {
          log.error("Error loading master data:", error);
        }
        // Fallback steel specifications
        const fallbackSteelSpecs = [
          // South African Standards
          { id: 1, steelSpecName: "SABS 62 ERW Medium" },
          { id: 2, steelSpecName: "SABS 62 ERW Heavy" },
          { id: 3, steelSpecName: "SABS 719 ERW" },
          // Carbon Steel - ASTM A106 (High-Temp Seamless)
          { id: 4, steelSpecName: "ASTM A106 Grade A" },
          { id: 5, steelSpecName: "ASTM A106 Grade B" },
          { id: 6, steelSpecName: "ASTM A106 Grade C" },
          // Carbon Steel - ASTM A53 (General Purpose)
          { id: 7, steelSpecName: "ASTM A53 Grade A" },
          { id: 8, steelSpecName: "ASTM A53 Grade B" },
          // Line Pipe - API 5L (Oil/Gas Pipelines)
          { id: 9, steelSpecName: "API 5L Grade A" },
          { id: 10, steelSpecName: "API 5L Grade B" },
          { id: 11, steelSpecName: "API 5L X42" },
          { id: 12, steelSpecName: "API 5L X46" },
          { id: 13, steelSpecName: "API 5L X52" },
          { id: 14, steelSpecName: "API 5L X56" },
          { id: 15, steelSpecName: "API 5L X60" },
          { id: 16, steelSpecName: "API 5L X65" },
          { id: 17, steelSpecName: "API 5L X70" },
          { id: 18, steelSpecName: "API 5L X80" },
          // Low Temperature - ASTM A333
          { id: 19, steelSpecName: "ASTM A333 Grade 1" },
          { id: 20, steelSpecName: "ASTM A333 Grade 3" },
          { id: 21, steelSpecName: "ASTM A333 Grade 6" },
          // Heat Exchangers/Boilers
          { id: 22, steelSpecName: "ASTM A179" },
          { id: 23, steelSpecName: "ASTM A192" },
          // Structural Tubing - ASTM A500
          { id: 24, steelSpecName: "ASTM A500 Grade A" },
          { id: 25, steelSpecName: "ASTM A500 Grade B" },
          { id: 26, steelSpecName: "ASTM A500 Grade C" },
          // Alloy Steel - ASTM A335 (Chrome-Moly)
          { id: 27, steelSpecName: "ASTM A335 P5" },
          { id: 28, steelSpecName: "ASTM A335 P9" },
          { id: 29, steelSpecName: "ASTM A335 P11" },
          { id: 30, steelSpecName: "ASTM A335 P22" },
          { id: 31, steelSpecName: "ASTM A335 P91" },
          // Stainless Steel - ASTM A312
          { id: 32, steelSpecName: "ASTM A312 TP304" },
          { id: 33, steelSpecName: "ASTM A312 TP304L" },
          { id: 34, steelSpecName: "ASTM A312 TP316" },
          { id: 35, steelSpecName: "ASTM A312 TP316L" },
          { id: 36, steelSpecName: "ASTM A312 TP321" },
          { id: 37, steelSpecName: "ASTM A312 TP347" },
        ];
        // Fallback flange standards - IDs must match database
        const fallbackFlangeStandards = [
          // British Standards
          { id: 1, code: "BS 4504" },
          // South African Standards
          { id: 2, code: "SABS 1123" },
          { id: 3, code: "BS 10" },
          // American Standards (ASME/ANSI)
          { id: 4, code: "ASME B16.5" },
          { id: 5, code: "ASME B16.47" },
          // European Standards
          { id: 6, code: "EN 1092-1" },
          { id: 7, code: "DIN" },
          // Japanese Standards
          { id: 8, code: "JIS B2220" },
          // API Standards
          { id: 9, code: "API 6A" },
          { id: 10, code: "AWWA C207" },
          // Australian Standards
          { id: 11, code: "AS 2129" },
          { id: 12, code: "AS 4087" },
          // Russian Standards
          { id: 13, code: "GOST" },
        ];
        // Fallback nominal bores
        const fallbackNominalBores = [
          { id: 1, nominalDiameterMm: 15, outsideDiameterMm: 21.3 },
          { id: 2, nominalDiameterMm: 20, outsideDiameterMm: 26.7 },
          { id: 3, nominalDiameterMm: 25, outsideDiameterMm: 33.4 },
          { id: 4, nominalDiameterMm: 32, outsideDiameterMm: 42.2 },
          { id: 5, nominalDiameterMm: 40, outsideDiameterMm: 48.3 },
          { id: 6, nominalDiameterMm: 50, outsideDiameterMm: 60.3 },
          { id: 7, nominalDiameterMm: 65, outsideDiameterMm: 73.0 },
          { id: 8, nominalDiameterMm: 80, outsideDiameterMm: 88.9 },
          { id: 9, nominalDiameterMm: 100, outsideDiameterMm: 114.3 },
          { id: 10, nominalDiameterMm: 125, outsideDiameterMm: 139.7 },
          { id: 11, nominalDiameterMm: 150, outsideDiameterMm: 168.3 },
          { id: 12, nominalDiameterMm: 200, outsideDiameterMm: 219.1 },
          { id: 13, nominalDiameterMm: 250, outsideDiameterMm: 273.0 },
          { id: 14, nominalDiameterMm: 300, outsideDiameterMm: 323.8 },
          { id: 15, nominalDiameterMm: 350, outsideDiameterMm: 355.6 },
          { id: 16, nominalDiameterMm: 400, outsideDiameterMm: 406.4 },
          { id: 17, nominalDiameterMm: 450, outsideDiameterMm: 457.2 },
          { id: 18, nominalDiameterMm: 500, outsideDiameterMm: 508.0 },
          { id: 19, nominalDiameterMm: 600, outsideDiameterMm: 609.6 },
          { id: 20, nominalDiameterMm: 750, outsideDiameterMm: 762.0 },
          { id: 21, nominalDiameterMm: 900, outsideDiameterMm: 914.4 },
          { id: 22, nominalDiameterMm: 1000, outsideDiameterMm: 1016.0 },
          { id: 23, nominalDiameterMm: 1200, outsideDiameterMm: 1219.2 },
        ];
        setMasterData({
          steelSpecs: fallbackSteelSpecs,
          flangeStandards: fallbackFlangeStandards,
          pressureClasses: [],
          nominalBores: fallbackNominalBores,
        });
      } finally {
        setIsLoadingMasterData(false);
      }
    };

    loadMasterData();
  }, []);

  // Load RFQ data when editing (editRfqId prop provided)
  useEffect(() => {
    if (!editRfqId) return;

    log.debug("📝 Edit mode detected, loading RFQ via admin API:", editRfqId);

    const loadRfqForEdit = async () => {
      setIsLoadingDraft(true);
      try {
        const draft = await adminApiClient.getRfqFullDraft(editRfqId);
        log.debug("📦 Loading RFQ for edit:", draft);
        log.debug("📦 RFQ formData:", draft.formData);
        log.debug("📦 RFQ requiredProducts:", draft.requiredProducts);
        log.debug("📦 RFQ globalSpecs:", draft.globalSpecs);

        restoreFromDraft({
          formData: draft.formData,
          globalSpecs: draft.globalSpecs,
          requiredProducts: draft.requiredProducts,
          straightPipeEntries: draft.straightPipeEntries,
          currentStep: draft.currentStep,
        });

        setCurrentDraftId(toNumericDraftId(draft.id));
        setDraftNumber(draft.draftNumber);

        log.debug(`✅ Loaded RFQ ${draft.draftNumber} for editing`);
      } catch (error) {
        log.error("Failed to load RFQ for editing:", error);
        showToast("Failed to load the RFQ. Please try again.", "error");
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadRfqForEdit();
  }, [editRfqId, restoreFromDraft, showToast]);

  // Load draft from URL parameter (?draft=ID or ?draftId=ID)
  // Requires authentication - redirect to login if not authenticated
  useEffect(() => {
    const draftId = searchParams?.get("draft") || searchParams?.get("draftId");
    if (!draftId) return;
    if (isAuthLoading) return;

    log.debug("Draft parameter detected:", draftId);

    if (!isAuthenticated) {
      log.info("User not authenticated, redirecting to login to access draft");
      const currentUrl =
        // eslint-disable-next-line no-restricted-syntax -- SSR guard
        typeof window !== "undefined" ? window.location.pathname + window.location.search : "/rfq";
      router.push(`/customer/login?returnUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const draft = await draftsApi.getById(parseInt(draftId, 10));
        log.debug("Loading draft:", draft);

        restoreFromDraft({
          formData: draft.formData,
          globalSpecs: draft.globalSpecs as any,
          requiredProducts: draft.requiredProducts,
          straightPipeEntries: draft.straightPipeEntries as any,
          currentStep: draft.currentStep,
        });

        setCurrentDraftId(toNumericDraftId(draft.id));
        setDraftNumber(draft.draftNumber);
        // Capture the converted RFQ id so the BOQ step can offer a
        // "Re-send BOQ to Suppliers" recovery action for drafts that
        // already became RFQs.
        const rawConvertedRfqId = draft.convertedRfqId;
        setConvertedRfqId(rawConvertedRfqId ?? null);

        log.debug(`Loaded draft ${draft.draftNumber}`);
      } catch (error) {
        log.error("Failed to load draft:", error);
        showToast("Failed to load the saved draft. Starting with a new form.", "error");
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [
    searchParams,
    restoreFromDraft,
    showToast,
    setIsLoadingDraft,
    setCurrentDraftId,
    setDraftNumber,
    isAuthenticated,
    isAuthLoading,
    router,
  ]);

  // Load anonymous draft from recovery token URL parameter
  // Also compare with localStorage draft and use the newer one
  useEffect(() => {
    const recoveryToken = searchParams?.get("recover");
    if (!recoveryToken) return;
    if (hasProcessedRecoveryToken) return;

    setHasProcessedRecoveryToken(true);

    const loadRecoveryDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const { anonymousDraftsApi } = await import("@/app/lib/api/client");
        const serverDraft = await anonymousDraftsApi.getByToken(recoveryToken);
        log.debug(
          "📥 Loaded anonymous draft from recovery token:",
          JSON.stringify(serverDraft, null, 2),
        );
        log.debug("📥 serverDraft.formData:", JSON.stringify(serverDraft.formData, null, 2));
        log.debug("📥 serverDraft.entries:", serverDraft.entries?.length, "entries");
        log.debug("📥 serverDraft.globalSpecs:", JSON.stringify(serverDraft.globalSpecs, null, 2));

        const localDraft = loadLocalDraft();
        let useServerDraft = true;
        let draftSource = "recovery link";

        if (localDraft?.lastSaved && serverDraft.updatedAt) {
          const localDate = fromISO(localDraft.lastSaved);
          const serverDate = fromISO(serverDraft.updatedAt);

          log.debug("Comparing draft timestamps:", {
            local: localDraft.lastSaved,
            server: serverDraft.updatedAt,
            localNewer: localDate > serverDate,
          });

          if (localDate > serverDate) {
            useServerDraft = false;
            draftSource = "local browser storage (more recent)";
            log.debug("Using localStorage draft (newer than server)");
          }
        }

        if (useServerDraft) {
          restoreFromDraft({
            formData: serverDraft.formData,
            globalSpecs: serverDraft.globalSpecs,
            requiredProducts: serverDraft.requiredProducts,
            straightPipeEntries: serverDraft.entries,
            currentStep: serverDraft.currentStep,
          });
          // Anonymous recovery flow doesn't carry a server draftId
          // (anonymous drafts use tokens, not the authenticated
          // drafts table), so we deliberately don't attach here.
          clearLocalDraft();
        } else if (localDraft) {
          restoreFromDraft({
            formData: localDraft.rfqData,
            globalSpecs: localDraft.globalSpecs,
            requiredProducts: localDraft.rfqData?.requiredProducts,
            straightPipeEntries: localDraft.entries,
            currentStep: localDraft.currentStep,
          });
          {
            const restoredDraftId = toNumericDraftId(localDraft.draftId);
            if (restoredDraftId) setCurrentDraftId(restoredDraftId);
          }
          if (localDraft.draftNumber) setDraftNumber(localDraft.draftNumber);
        }

        setHasCheckedLocalDraft(true);
        showToast(`Draft restored from ${draftSource}`, "success");
      } catch (error) {
        log.error("Failed to load draft from recovery token:", error);
        const localDraft = loadLocalDraft();
        if (localDraft?.rfqData) {
          log.debug("Server draft failed, falling back to localStorage");
          restoreFromDraft({
            formData: localDraft.rfqData,
            globalSpecs: localDraft.globalSpecs,
            requiredProducts: localDraft.rfqData?.requiredProducts,
            straightPipeEntries: localDraft.entries,
            currentStep: localDraft.currentStep,
          });
          {
            const restoredDraftId = toNumericDraftId(localDraft.draftId);
            if (restoredDraftId) setCurrentDraftId(restoredDraftId);
          }
          if (localDraft.draftNumber) setDraftNumber(localDraft.draftNumber);
          setHasCheckedLocalDraft(true);
          showToast("Draft restored from local storage (recovery link expired)", "warning");
        } else {
          showToast("Failed to load draft. The link may have expired.", "error");
        }
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadRecoveryDraft();
  }, [
    searchParams,
    restoreFromDraft,
    clearLocalDraft,
    loadLocalDraft,
    showToast,
    hasProcessedRecoveryToken,
    setHasProcessedRecoveryToken,
    setHasCheckedLocalDraft,
    setIsLoadingDraft,
    setCurrentDraftId,
    setDraftNumber,
  ]);

  // Check for existing localStorage draft on mount.
  // Applies to BOTH unregistered AND authenticated users.
  //
  // v1.4.3 behaviour change: if the saved draft is FRESH (saved
  // within the last 60 min — i.e. it's almost certainly the same
  // session the user is mid-flight on), silently restore without
  // prompting. The previous "Restore your draft?" prompt-on-every-
  // reload was the wrong UX — every dev-server hot-reload sent the
  // user back to Step 1 with a dialog they had to dismiss before
  // they could continue. Older drafts (>60 min) still surface the
  // prompt because they're more likely to be from a different
  // session that the user may not want to merge into.
  useEffect(() => {
    if (hasCheckedLocalDraft) return;
    if (isLoadingDraft) return;
    if (editRfqId) return;

    const draftIdFromUrl = searchParams?.get("draft") || searchParams?.get("draftId");
    if (draftIdFromUrl) return;

    const recoveryToken = searchParams?.get("recover");
    if (recoveryToken) return;

    // "New RFQ" link in the customer toolbar appends ?new=1 to
    // force a fresh start even when the user is already on /create.
    // Wipe localStorage so the auto-restore on the next mount can't
    // resurrect the abandoned draft.
    const startFresh = searchParams?.get("new") === "1";
    if (startFresh) {
      clearLocalDraft();
      setHasCheckedLocalDraft(true);
      // The fresh start has been honoured — strip ?new=1 so a browser
      // refresh auto-restores the in-progress draft instead of wiping
      // it again on every reload.
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      return;
    }

    setHasCheckedLocalDraft(true);

    const draft = loadLocalDraft();
    if (!draft?.rfqData) return;

    log.debug("Found localStorage draft:", {
      fresh: isLocalDraftFresh,
      lastSaved: draft.lastSaved,
    });
    if (isLocalDraftFresh) {
      // Silent auto-restore — no dialog, no Step 1 detour. Drops
      // the user straight back where they were.
      restoreFromDraft({
        formData: draft.rfqData,
        globalSpecs: draft.globalSpecs,
        requiredProducts: draft.rfqData?.requiredProducts,
        straightPipeEntries: draft.entries,
        currentStep: draft.currentStep,
      });
      // Rehydrate the server attachment so subsequent saves
      // update the existing row instead of spawning new drafts.
      {
        const autoRestoredDraftId = toNumericDraftId(draft.draftId);
        if (autoRestoredDraftId) setCurrentDraftId(autoRestoredDraftId);
      }
      if (draft.draftNumber) setDraftNumber(draft.draftNumber);
      log.info(`Auto-restored draft from localStorage at step ${draft.currentStep}`);
      return;
    }

    setPendingLocalDraft(draft);
    setShowDraftRestorePrompt(true);
  }, [
    isLoadingDraft,
    editRfqId,
    searchParams,
    loadLocalDraft,
    hasCheckedLocalDraft,
    isLocalDraftFresh,
    restoreFromDraft,
    setCurrentDraftId,
    setDraftNumber,
    setHasCheckedLocalDraft,
    setPendingLocalDraft,
    setShowDraftRestorePrompt,
  ]);

  // Auto-save to localStorage on every meaningful field change.
  // Applies to BOTH authenticated and unregistered users — the
  // localStorage copy is the per-browser fallback that survives
  // dev-server hot reloads, accidental tab closes, and crashes.
  // Authenticated users still graduate to the server draft when
  // they hit Save Progress; this just prevents data loss in
  // between manual saves.
  //
  // CRITICAL (v1.4.3 hotfix): the previous "has content" check
  // included rawCustomerEmail || rfqData.projectName, both of
  // which are autogenerated stub values on the /create page when
  // the user is logged in. That meant the autosave fired on the
  // EMPTY initial form and overwrote a real saved draft from a
  // prior session with nothing. Fix: only count "real content" —
  // entries the user has actually added, globalSpecs they've
  // actually set, or progress past Step 1.
  useEffect(() => {
    if (isLoadingDraft) return;
    if (!hasCheckedLocalDraft) return;

    const itemsArr = rfqData.items;
    const itemCount = itemsArr ? itemsArr.length : 0;
    const globalSpecsObj = rfqData.globalSpecs;
    const globalSpecsKeys = globalSpecsObj ? keys(globalSpecsObj) : [];
    const userAddedItems = itemCount > 0;
    const userSetGlobalSpecs = globalSpecsKeys.length > 0;
    const userPastStepOne = currentStep >= 2;
    const hasMeaningfulContent = userAddedItems || userSetGlobalSpecs || userPastStepOne;

    if (!hasMeaningfulContent) return;

    // Belt + braces: never overwrite a more-complete saved draft
    // with strictly less data. Catches any future bug that bypasses
    // the meaningful-content guard above.
    const existing = loadLocalDraft();
    const existingEntries = existing ? existing.entries : null;
    const existingItemCount = existingEntries ? existingEntries.length : 0;
    const existingStep = existing ? existing.currentStep : 0;
    const wouldShrink = existing && itemCount < existingItemCount && currentStep < existingStep;
    if (wouldShrink) {
      log.warn(
        `Autosave skipped — would shrink draft from ${existingItemCount} items / step ${existingStep} to ${itemCount} items / step ${currentStep}`,
      );
      return;
    }

    saveLocalDraft({
      rfqData: {
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
      currentStep,
      entries: rfqData.items,
      customerEmail: rfqData.customerEmail,
      // Carry the server attachment forward on every autosave so
      // the debounced flush doesn't drop it. Coerced — a non-numeric
      // id would 400 every subsequent server save (issue #357).
      draftId: toNumericDraftId(currentDraftId) || undefined,
      draftNumber: draftNumber || undefined,
    });
  }, [
    isLoadingDraft,
    rfqData.projectName,
    rfqData.projectType,
    rfqData.description,
    rfqData.customerName,
    rfqData.customerEmail,
    rfqData.customerPhone,
    rfqData.requiredDate,
    rfqData.requiredProducts,
    rfqData.notes,
    rfqData.latitude,
    rfqData.longitude,
    rfqData.siteAddress,
    rfqData.region,
    rfqData.country,
    rfqData.mineId,
    rfqData.mineName,
    rfqData.skipDocuments,
    rfqData.useNix,
    rfqData.nixPopupShown,
    rfqData.globalSpecs,
    rfqData.items,
    currentStep,
    currentDraftId,
    draftNumber,
    saveLocalDraft,
  ]);

  const fetchAndSelectPressureClass = usePressureClassSelection({
    masterData,
    setAvailablePressureClasses,
    setPressureClassesByStandard,
  });

  // Fetch available schedules for a specific entry
  // IMPORTANT: This function should NOT replace working fallback data with API data
  // because API schedule names may differ from fallback names, breaking the selected value
  const fetchAvailableSchedules = useCallback(
    async (entryId: string, steelSpecId: number, nominalBoreMm: number) => {
      // Check for fallback data first to provide immediate response - use correct schedule list based on steel spec
      const fallbackSchedules = scheduleListForSpec(nominalBoreMm, steelSpecId);

      // If we already have schedules for this entry, don't fetch from API
      // This prevents API data with different schedule names from breaking the selection
      const existingSchedules = availableSchedulesMap[entryId];
      if (existingSchedules && existingSchedules.length > 0) {
        log.debug(
          `[fetchAvailableSchedules] Entry ${entryId} already has ${existingSchedules.length} schedules, skipping API fetch`,
        );
        return existingSchedules;
      }

      // Use fallback data - it's reliable and consistent
      if (fallbackSchedules.length > 0) {
        log.debug(
          `[fetchAvailableSchedules] Using ${fallbackSchedules.length} fallback schedules for ${nominalBoreMm}mm`,
        );
        setAvailableSchedulesMap((prev) => ({
          ...prev,
          [entryId]: fallbackSchedules,
        }));
        return fallbackSchedules;
      }

      // Only try API if we have no fallback data
      try {
        const { masterDataApi } = await import("@/app/lib/api/client");

        log.debug(
          `[fetchAvailableSchedules] Entry: ${entryId}, Steel: ${steelSpecId}, NB: ${nominalBoreMm}mm`,
        );

        // Find the nominal outside diameter ID from nominalBoreMm
        const nominalBore = masterData.nominalBores?.find((nb: any) => {
          const rawNominal_diameter_mm = nb.nominal_diameter_mm;
          const nbValue = rawNominal_diameter_mm || nb.nominalDiameterMm;
          return nbValue === nominalBoreMm || nbValue === Number(nominalBoreMm);
        });

        if (!nominalBore) {
          log.warn(
            `[fetchAvailableSchedules] No nominal bore found for ${nominalBoreMm}mm in masterData`,
          );
          return [];
        }

        log.debug(`[fetchAvailableSchedules] Found nominalBore ID: ${nominalBore.id}`);

        const dimensions = await masterDataApi.getPipeDimensionsAll(steelSpecId, nominalBore.id);

        const rawLength = dimensions?.length;

        log.debug(`[fetchAvailableSchedules] Got ${rawLength || 0} dimensions from API`);

        if (dimensions && dimensions.length > 0) {
          setAvailableSchedulesMap((prev) => ({
            ...prev,
            [entryId]: dimensions,
          }));
          return dimensions;
        }

        return [];
      } catch (error) {
        if (error instanceof Error && error.message !== "Backend unavailable") {
          log.error("[fetchAvailableSchedules] Error:", error);
        }
        return [];
      }
    },
    [availableSchedulesMap, masterData.nominalBores],
  );

  // Refetch available schedules when global steel specification changes
  // NOTE: Removed rfqData.straightPipeEntries from dependencies to prevent re-fetching on every entry change
  // The NB onChange handler handles setting schedules when user selects a new NB
  useEffect(() => {
    const steelSpecId = rfqData.globalSpecs?.steelSpecificationId;
    if (!steelSpecId || !masterData.nominalBores?.length) return;

    // Only prefetch schedules when steel spec changes - this is a background operation
    // that won't overwrite existing schedule selections due to the check in fetchAvailableSchedules
    rfqData.straightPipeEntries.forEach((entry: StraightPipeEntry) => {
      if (entry.specs.nominalBoreMm) {
        fetchAvailableSchedules(entry.id, steelSpecId, entry.specs.nominalBoreMm);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqData.globalSpecs?.steelSpecificationId, masterData.nominalBores?.length]);

  // Auto-calculate when entry specifications change (with debounce)
  useEffect(() => {
    const calculateEntry = async (entry: StraightPipeEntry) => {
      const rawWorkingPressureBar = entry.specs.workingPressureBar;
      // Get working pressure from entry specs or global specs
      const workingPressureBar = rawWorkingPressureBar || rfqData.globalSpecs?.workingPressureBar;
      const rawWorkingTemperatureC = entry.specs.workingTemperatureC;
      const workingTemperatureC =
        rawWorkingTemperatureC || rfqData.globalSpecs?.workingTemperatureC;
      const rawSteelSpecificationId = entry.specs.steelSpecificationId;
      const steelSpecificationId =
        rawSteelSpecificationId || rfqData.globalSpecs?.steelSpecificationId;
      const rawFlangeStandardId = entry.specs.flangeStandardId;
      const flangeStandardId = rawFlangeStandardId || rfqData.globalSpecs?.flangeStandardId;
      const rawFlangePressureClassId = entry.specs.flangePressureClassId;
      const flangePressureClassId =
        rawFlangePressureClassId || rfqData.globalSpecs?.flangePressureClassId;

      const rawScheduleNumber = entry.specs.scheduleNumber;

      // Only auto-calculate if all required fields are present
      const hasRequiredFields =
        entry.specs.nominalBoreMm &&
        (rawScheduleNumber || entry.specs.wallThicknessMm) &&
        entry.specs.individualPipeLength &&
        entry.specs.quantityValue &&
        workingPressureBar;

      // Debug logging
      log.debug("📊 Auto-calculate check:", {
        entryId: entry.id,
        nominalBoreMm: entry.specs.nominalBoreMm,
        scheduleNumber: entry.specs.scheduleNumber,
        wallThicknessMm: entry.specs.wallThicknessMm,
        individualPipeLength: entry.specs.individualPipeLength,
        quantityValue: entry.specs.quantityValue,
        workingPressureBar,
        hasRequiredFields,
      });

      if (!hasRequiredFields) {
        log.debug("❌ Missing required fields, skipping calculation");
        return;
      }

      try {
        const { rfqApi } = await import("@/app/lib/api/client");
        // Merge entry specs with global specs
        const calculationData = {
          ...entry.specs,
          workingPressureBar,
          workingTemperatureC,
          steelSpecificationId,
          flangeStandardId,
          flangePressureClassId,
        };
        log.debug("🔄 Calling API with:", calculationData);
        const result = await rfqApi.calculate(calculationData);
        log.debug("✅ Calculation result:", result);

        const rawDesignation3 = masterData.pressureClasses?.find(
          (pc: { id: number; designation: string }) => pc.id === flangePressureClassId,
        )?.designation;

        // Recalculate flange weight based on actual pressure class used (may be overridden)
        // Default to PN16 if no pressure class is set
        const basePressureClassDesignation = rawDesignation3 || "PN16";
        const flangeStandardCode = masterData.flangeStandards?.find(
          (s: any) => s.id === flangeStandardId,
        )?.code;
        const rawFlangeTypeCode = entry.specs.flangeTypeCode;
        const flangeTypeCode = rawFlangeTypeCode || rfqData.globalSpecs?.flangeTypeCode;
        const pressureClassDesignation = getPressureClassWithFlangeType(
          basePressureClassDesignation,
          flangeTypeCode,
          flangeStandardCode,
        );

        const rawPipeEndConfiguration = entry.specs.pipeEndConfiguration;

        // Calculate number of flanges from pipe configuration if not in result
        const pipeEndConfig = rawPipeEndConfiguration || "PE";
        const physicalFlangesPerPipe = getPhysicalFlangeCount(pipeEndConfig);
        const rawCalculatedPipeCount = result?.calculatedPipeCount;
        const rawQuantityValue = entry.specs.quantityValue;
        const rawIndividualPipeLength = entry.specs.individualPipeLength;
        const calculatedPipeCount =
          rawCalculatedPipeCount ||
          Math.ceil((rawQuantityValue || 1) / (rawIndividualPipeLength || DEFAULT_PIPE_LENGTH_M));
        const rawNumberOfFlanges = result?.numberOfFlanges;
        // Puddle plates are priced from their dims, not as end flanges —
        // see useOrchestratorCalculations for rationale.
        const numberOfFlanges =
          (entry.specs as any).pipeType === "puddle"
            ? physicalFlangesPerPipe * calculatedPipeCount
            : rawNumberOfFlanges || physicalFlangesPerPipe * calculatedPipeCount;

        if (result && numberOfFlanges > 0) {
          let flangeWeightPerUnit = flangeWeightLookup(
            allWeights,
            entry.specs.nominalBoreMm!,
            pressureClassDesignation,
            flangeStandardCode || null,
            flangeTypeCode || "",
          );
          let flangeSpecData: FlangeSpecData | null = null;

          if (flangeStandardId && flangePressureClassId && entry.specs.nominalBoreMm) {
            const flangeTypeId = flangeTypeCode
              ? masterData.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode)?.id
              : undefined;
            flangeSpecData = await fetchFlangeSpecsStatic(
              entry.specs.nominalBoreMm,
              flangeStandardId,
              flangePressureClassId,
              flangeTypeId,
            );
            // Type-agnostic dimension mass only as fallback — see
            // useOrchestratorCalculations for rationale.
            if (
              flangeSpecData &&
              !hasFlangeWeightRecord(
                allWeights,
                entry.specs.nominalBoreMm!,
                pressureClassDesignation,
              )
            ) {
              flangeWeightPerUnit = flangeSpecData.flangeMassKg;
              log.debug(`🔧 Using dynamic flange specs: ${flangeWeightPerUnit}kg/flange`);
            }
          }

          const totalFlangeWeight = numberOfFlanges * flangeWeightPerUnit;
          const rawTotalPipeWeight = result.totalPipeWeight;
          const totalSystemWeight = (rawTotalPipeWeight || 0) + totalFlangeWeight;

          log.debug(
            `🔧 Recalculating flange weight for ${pressureClassDesignation}: ${flangeWeightPerUnit}kg/flange × ${numberOfFlanges} = ${totalFlangeWeight}kg`,
          );

          updateEntryCalculation(entry.id, {
            ...result,
            numberOfFlanges,
            flangeWeightPerUnit,
            totalFlangeWeight,
            totalSystemWeight,
            pressureClassUsed: pressureClassDesignation,
            flangeSpecs: flangeSpecData,
          } as any);
        } else {
          const rawTotalPipeWeight2 = result.totalPipeWeight;
          // No flanges - totalSystemWeight is just pipe weight
          updateEntryCalculation(entry.id, {
            ...result,
            totalSystemWeight: rawTotalPipeWeight2 || 0,
            numberOfFlanges: 0,
            totalFlangeWeight: 0,
            flangeWeightPerUnit: 0,
          } as any);
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If API returns 404 (NB/schedule combination not in database), use local calculation silently
        if (
          errorMessage.includes("API Error (404)") ||
          errorMessage.includes("not available in the database")
        ) {
          log.debug(
            "⚠️ API 404 - Using local calculation fallback for",
            entry.specs.nominalBoreMm,
            "NB",
          );
          const rawWallThicknessMm = entry.specs.wallThicknessMm;
          // Default wall thickness
          const wallThickness = rawWallThicknessMm || 6.35;

          const rawDesignation4 = masterData.pressureClasses?.find(
            (pc: { id: number; designation: string }) => pc.id === flangePressureClassId,
          )?.designation;

          // Get pressure class designation for accurate flange weights, default to PN16
          // Combine with flange type code for SABS 1123 / BS 4504 standards
          const basePressureClassDesignation = rawDesignation4 || "PN16";
          const flangeStandardCode = masterData.flangeStandards?.find(
            (s: any) => s.id === flangeStandardId,
          )?.code;
          const rawFlangeTypeCode2 = entry.specs.flangeTypeCode;
          const flangeTypeCode = rawFlangeTypeCode2 || rfqData.globalSpecs?.flangeTypeCode;
          const pressureClassDesignation = getPressureClassWithFlangeType(
            basePressureClassDesignation,
            flangeTypeCode,
            flangeStandardCode,
          );

          const rawQuantityType = entry.specs.quantityType;
          const rawPipeEndConfiguration2 = entry.specs.pipeEndConfiguration;

          const localResult = calculateLocalPipeResult(
            nbToOdMap,
            allWeights,
            entry.specs.nominalBoreMm!,
            wallThickness,
            entry.specs.individualPipeLength!,
            entry.specs.quantityValue!,
            rawQuantityType || "number_of_pipes",
            rawPipeEndConfiguration2 || "PE",
            pressureClassDesignation,
            flangeStandardCode,
            flangeTypeCode,
          );
          log.debug("✅ Local calculation result:", localResult);
          updateEntryCalculation(entry.id, localResult);
          return;
        }

        // For any other error, also use local calculation fallback
        log.debug("⚠️ API error - Using local calculation fallback:", errorMessage);
        const rawWallThicknessMm2 = entry.specs.wallThicknessMm;
        const wallThickness = rawWallThicknessMm2 || 6.35;

        const rawDesignation5 = masterData.pressureClasses?.find(
          (pc: { id: number; designation: string }) => pc.id === flangePressureClassId,
        )?.designation;

        const basePressureClassDesignation = rawDesignation5 || "PN16";
        const flangeStandardCode = masterData.flangeStandards?.find(
          (s: any) => s.id === flangeStandardId,
        )?.code;
        const rawFlangeTypeCode3 = entry.specs.flangeTypeCode;
        const flangeTypeCode = rawFlangeTypeCode3 || rfqData.globalSpecs?.flangeTypeCode;
        const pressureClassDesignation = getPressureClassWithFlangeType(
          basePressureClassDesignation,
          flangeTypeCode,
          flangeStandardCode,
        );

        const rawQuantityType2 = entry.specs.quantityType;
        const rawPipeEndConfiguration3 = entry.specs.pipeEndConfiguration;

        const localResult = calculateLocalPipeResult(
          nbToOdMap,
          allWeights,
          entry.specs.nominalBoreMm!,
          wallThickness,
          entry.specs.individualPipeLength!,
          entry.specs.quantityValue!,
          rawQuantityType2 || "number_of_pipes",
          rawPipeEndConfiguration3 || "PE",
          pressureClassDesignation,
          flangeStandardCode,
          flangeTypeCode,
        );
        log.debug("✅ Local calculation fallback result:", localResult);
        updateEntryCalculation(entry.id, localResult);
      }
    };

    // Debounce the calculation to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      // Calculate all entries that have complete data
      rfqData.straightPipeEntries.forEach((entry: StraightPipeEntry) => {
        calculateEntry(entry);
      });
      // 500ms debounce delay
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    // Watch for changes in any entry's specs (including flange overrides)
    JSON.stringify(
      rfqData.straightPipeEntries.map((e: StraightPipeEntry) => ({
        id: e.id,
        nominalBoreMm: e.specs.nominalBoreMm,
        scheduleNumber: e.specs.scheduleNumber,
        wallThicknessMm: e.specs.wallThicknessMm,
        individualPipeLength: e.specs.individualPipeLength,
        quantityValue: e.specs.quantityValue,
        quantityType: e.specs.quantityType,
        pipeEndConfiguration: e.specs.pipeEndConfiguration,
        flangeStandardId: e.specs.flangeStandardId,
        flangePressureClassId: e.specs.flangePressureClassId,
        flangeTypeCode: e.specs.flangeTypeCode,
        hasFlangeOverride: e.hasFlangeOverride,
        flangeOverrideConfirmed: e.flangeOverrideConfirmed,
      })),
    ),
    // Also watch global specs for calculation
    rfqData.globalSpecs?.workingPressureBar,
    rfqData.globalSpecs?.workingTemperatureC,
    rfqData.globalSpecs?.steelSpecificationId,
    rfqData.globalSpecs?.flangeStandardId,
    rfqData.globalSpecs?.flangePressureClassId,
    rfqData.globalSpecs?.flangeTypeCode,
  ]);

  // Initialize pressure classes when flange standard is set (e.g., from saved state or initial load)
  useEffect(() => {
    const initializePressureClasses = async () => {
      const standardId = rfqData.globalSpecs?.flangeStandardId;
      if (standardId && availablePressureClasses.length === 0) {
        log.debug(`Initializing pressure classes for standard ${standardId}`);
        const steelSpec = masterData.steelSpecs?.find(
          (s: any) => s.id === rfqData.globalSpecs?.steelSpecificationId,
        );
        const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
        const recommendedId = await fetchAndSelectPressureClass(
          standardId,
          rfqData.globalSpecs?.workingPressureBar,
          rfqData.globalSpecs?.workingTemperatureC,
          materialGroup,
        );
        // Auto-select if not already set. Uses the non-flagging setter
        // so this automatic adjustment never marks the RFQ as edited.
        if (recommendedId && !rfqData.globalSpecs?.flangePressureClassId) {
          applyAutoGlobalSpecs({
            ...rfqData.globalSpecs,
            flangePressureClassId: recommendedId,
          });
        }
      }
    };
    initializePressureClasses();
  }, [rfqData.globalSpecs?.flangeStandardId, masterData.steelSpecs]);

  // Scroll to top helper function - scrolls both the content container and the window
  const {
    scrollToTop,
    scrollToFirstError,
    nextStep,
    handlePrevStep,
    handleNextStep,
    handleStepClick,
    isNixExtractedItem,
    trackNixCorrection,
    handleSaveProgress,
    handleSubmit,
    handleResubmit,
    handleResendBoq,
    renderCurrentStep,
    steps,
    showSaveConfirmation,
    setShowSaveConfirmation,
  } = useOrchestratorActions({
    allBnw,
    allGaskets,
    allWeights,
    clearLocalDraft,
    editRfqId,
    isAuthenticated,
    isEditing,
    nbToOdMap,
    onSuccess,
    originalNextStep,
    showToast,
    convertedRfqId,
    currentClarificationIndex,
    currentDraftId,
    currentStep,
    draftNumber,
    draftSaveAndSendRecoveryEmail,
    fetchAndSelectPressureClass,
    fetchAvailableSchedules,
    getFilteredPressureClasses,
    masterData,
    nixClarifications,
    nixExtractionId,
    nixItemsPageReady,
    pendingDocuments,
    pendingTenderDocuments,
    prevStep,
    rfqData,
    rfqDataRef,
    saveDraft: saveLocalDraft,
    scrollContainerRef,
    setCurrentDraftId,
    setCurrentStep,
    setDraftNumber,
    setIsSavingDraft,
    setIsSubmitting,
    setPendingDocuments,
    setPendingTenderDocuments,
    setSubmissionItemCount,
    setValidationErrors,
    totalWeight: getTotalWeight,
    updateEntryCalculation,
    updateItem,
    updateStraightPipeEntry,
  });

  const rawCurrentClarificationIndex = nixClarifications[currentClarificationIndex];
  const rawTitle = steps.find((s) => s.number === currentStep)?.title;
  const rawProjectName6 = rfqData?.projectName;

  return {
    currentClarificationIndex,
    currentDraftId,
    currentStep,
    draftCloseSaveProgressDialog,
    draftNumber,
    draftOpenSaveProgressDialog,
    draftSaveProgressToServer,
    handleDiscardLocalDraft,
    handleNextStep,
    handlePrevStep,
    handleRestoreLocalDraft,
    handleSaveProgress,
    handleStepClick,
    hasLocalDraft,
    isAuthenticated,
    isEditing,
    isLoadingMasterData,
    isNixProcessing,
    isSavingDraft,
    isSavingProgress,
    isSubmitting,
    localDraftLastSaved,
    markRfqEdited,
    nextStep,
    nixAccept,
    nixChatPanelGeometry,
    nixChatPanelVisible,
    nixChatSessionId,
    nixClarifications,
    nixCloseChatPanel,
    nixCloseClarification,
    nixDecline,
    nixFormHelperMinimized,
    nixFormHelperReactivate,
    nixGuidedModeActive,
    nixProcessingProgress,
    nixProcessingStatus,
    nixProcessingTimeRemaining,
    nixSetChatPanelGeometry,
    nixSetChatSessionId,
    nixSkipClarification,
    nixSubmitClarification,
    nixSubmitClarificationBatch,
    onCancel,
    pendingDocuments,
    pendingLocalDraft,
    rawCurrentClarificationIndex,
    rawProjectName6,
    rawTitle,
    renderCurrentStep,
    rfqData,
    saveProgressStep,
    scrollContainerRef,
    searchParams,
    setShowCloseConfirmation,
    showCloseConfirmation,
    showDraftRestorePrompt,
    showNixClarification,
    showNixPopup,
    showSaveConfirmation,
    showSaveProgressDialog,
    showToast,
    steps,
    submissionItemCount,
    userHasEdited,
  };
}
export type OrchestratorLogic = ReturnType<typeof useOrchestratorLogic>;
