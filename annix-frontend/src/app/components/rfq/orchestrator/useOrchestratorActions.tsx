"use client";
import { keys } from "es-toolkit/compat";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { adminApiClient } from "@/app/lib/api/adminApi";
import {
  anonymousDraftsApi,
  boqApi,
  draftsApi,
  rfqDocumentApi,
  SessionExpiredError,
} from "@/app/lib/api/client";
import { nowISO } from "@/app/lib/datetime";
import { toNumericDraftId } from "./draft-id";
import type { PipeItem } from "@/app/lib/hooks/useRfqForm";
import { log } from "@/app/lib/logger";
import { nixApi } from "@/app/lib/nix";
import type { RfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { generateClientItemNumber } from "@/app/lib/utils/systemUtils";
import {
  validatePage1RequiredFields,
  validatePage2Specifications,
  validatePage3Items,
} from "@/app/lib/utils/validation";
import BOQStep from "../steps/BOQStep";
import ItemUploadStep from "../steps/ItemUploadStep";
import PreQuoteClarificationsStep from "../steps/PreQuoteClarificationsStep";
import ProjectDetailsStep from "../steps/ProjectDetailsStep";
import ReviewSubmitStep from "../steps/ReviewSubmitStep";
import SpecificationsStep from "../steps/SpecificationsStep";
import {
  buildBoqConsolidation,
  buildCustomerProjectInfo,
  buildRfqPayload,
  countDroppedMiscItems,
  countUncalculatedItems,
  extractErrorMessage,
  mapItemToUnified,
  resolveGlobalSpecsOverrides,
  submitBoqForRfq,
  validateItemsForSubmission,
} from "../utils/rfqSubmissionHelpers";
import { useOrchestratorCalculations } from "./useOrchestratorCalculations";
import { usePressureClassSelection } from "./usePressureClassSelection";

type OrchestratorActionsDeps = Pick<
  RfqWizardStore,
  | "currentClarificationIndex"
  | "currentDraftId"
  | "currentStep"
  | "draftNumber"
  | "draftSaveAndSendRecoveryEmail"
  | "masterData"
  | "nixClarifications"
  | "nixExtractionId"
  | "nixItemsPageReady"
  | "pendingDocuments"
  | "pendingTenderDocuments"
  | "prevStep"
  | "rfqData"
  | "setCurrentDraftId"
  | "setCurrentStep"
  | "setDraftNumber"
  | "setIsSavingDraft"
  | "setIsSubmitting"
  | "setPendingDocuments"
  | "setPendingTenderDocuments"
  | "setValidationErrors"
  | "totalWeight"
  | "updateEntryCalculation"
  | "updateItem"
  | "updateStraightPipeEntry"
> & {
  convertedRfqId: number | null;
  setSubmissionItemCount: (n: number) => void;
  fetchAndSelectPressureClass: ReturnType<typeof usePressureClassSelection>;
  fetchAvailableSchedules: (...args: any[]) => any;
  getFilteredPressureClasses: (...args: any[]) => any;
  rfqDataRef: React.MutableRefObject<{ items: any[]; [key: string]: any }>;
  saveDraft: (...args: any[]) => any;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  allBnw: any[];
  allGaskets: any[];
  allWeights: any[];
  clearLocalDraft: (...args: any[]) => any;
  editRfqId: number | undefined;
  isAuthenticated: boolean;
  isEditing: boolean;
  nbToOdMap: Record<number, number>;
  onSuccess: (rfqId: string) => void;
  originalNextStep: (...args: any[]) => any;
  showToast: (...args: any[]) => any;
};

export function useOrchestratorActions(deps: OrchestratorActionsDeps) {
  const {
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
    saveDraft,
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
    totalWeight,
    updateEntryCalculation,
    updateItem,
    updateStraightPipeEntry,
  } = deps;

  const scrollToTop = () => {
    // Use setTimeout to ensure content has rendered before scrolling
    setTimeout(() => {
      // Scroll the container if available
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      // Also scroll the window/document to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Scroll the document element as fallback
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);
  };

  // Scroll to first error field helper function
  const scrollToFirstError = (errorKey: string) => {
    // Map error keys to field identifiers
    const errorKeyToSelector: Record<string, string> = {
      // Page 1 fields
      projectName: '[data-field="projectName"]',
      projectType: '[data-field="projectType"]',
      customerName: '[data-field="customerName"]',
      description: '[data-field="description"]',
      customerEmail: '[data-field="customerEmail"]',
      customerPhone: '[data-field="customerPhone"]',
      requiredDate: '[data-field="requiredDate"]',
      requiredProducts: '[data-field="requiredProducts"]',
      // Page 2 fields - Global Specifications
      workingPressure: '[data-field="workingPressure"]',
      workingTemperature: '[data-field="workingTemperature"]',
      steelPipesConfirmation: '[data-field="steelPipesConfirmation"]',
      fastenersConfirmation: '[data-field="fastenersConfirmation"]',
      externalCoatingType: '[data-field="externalCoatingType"]',
      internalLiningType: '[data-field="internalLiningType"]',
      flangeStandard: '[data-field="flangeStandard"]',
      flangePressureClass: '[data-field="flangePressureClass"]',
      steelSpecification: '[data-field="steelSpecification"]',
      // Fitting-specific fields
      fittingType: '[data-field="fittingType"]',
      fittingNominalDiameter: '[data-field="fittingNominalDiameter"]',
      branchNominalDiameter: '[data-field="branchNominalDiameter"]',
    };

    // Check if it's a pipe-specific error (pipe_0_nb, pipe_1_length, etc.)
    let selector = errorKeyToSelector[errorKey];
    if (!selector && errorKey.startsWith("pipe_")) {
      // Extract index and field type from error key like "pipe_0_nb"
      const match = errorKey.match(/pipe_(\d+)_(\w+)/);
      if (match) {
        const [, index, fieldType] = match;
        selector = `[data-field="pipe_${index}_${fieldType}"]`;
      }
    }

    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add visual highlight effect
        element.classList.add("ring-2", "ring-red-500", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-red-500", "ring-offset-2");
        }, 3000);
        // Try to focus the input element if it exists
        const input = element.querySelector("input, select, textarea") as HTMLElement;
        if (input) {
          setTimeout(() => input.focus(), 300);
        }
        return;
      }
    }

    // Fallback: try to find by name attribute or scroll to top
    const fallbackElement =
      document.querySelector(`[name="${errorKey}"]`) || document.querySelector(`#${errorKey}`);
    if (fallbackElement) {
      fallbackElement.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      scrollToTop();
    }
  };

  // Enhanced next step function with validation
  const nextStep = () => {
    // Validate current step before proceeding
    let errors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        errors = validatePage1RequiredFields(rfqData);
        break;
      case 2:
        errors = validatePage2Specifications(rfqData.globalSpecs, masterData);
        // Check if steel pipes is selected but not confirmed
        if (
          rfqData.requiredProducts?.includes("fabricated_steel") &&
          !rfqData.globalSpecs?.steelPipesSpecsConfirmed
        ) {
          errors.steelPipesConfirmation =
            "Please confirm the Steel Pipe Specifications before proceeding";
        }
        // Check if fasteners/gaskets is selected but not confirmed
        if (
          rfqData.requiredProducts?.includes("fasteners_gaskets") &&
          !rfqData.globalSpecs?.fastenersConfirmed
        ) {
          errors.fastenersConfirmation =
            "Please confirm the Fasteners & Gaskets selection before proceeding";
        }
        // Check if surface protection is selected but coating/lining types are not selected
        if (rfqData.requiredProducts?.includes("surface_protection")) {
          if (!rfqData.globalSpecs?.externalCoatingType) {
            errors.externalCoatingType = "Please select an External Coating Type";
          }
          // Internal lining is required unless external is Galvanized (which covers both)
          if (
            rfqData.globalSpecs?.externalCoatingType !== "Galvanized" &&
            !rfqData.globalSpecs?.internalLiningType
          ) {
            errors.internalLiningType = "Please select an Internal Lining Type";
          }
        }
        break;
      case 3:
        errors = validatePage3Items(rfqData.straightPipeEntries);
        break;
    }

    setValidationErrors(errors);

    // Only proceed if no validation errors
    if (keys(errors).length === 0) {
      // For unregistered users on page 1, save draft and send welcome email in background
      if (currentStep === 1) {
        draftSaveAndSendRecoveryEmail(isAuthenticated);
      }
      // When the customer accepted a BOQ extraction (or hit Confirm
      // on the unified document bucket), the wizard collapses to
      // three logical stops: Project Details → Clarifications → BOQ.
      // Steps 2 (Specs), 3 (Items) and 4 (Review) are skipped because
      // every extracted item already carries its own specs and the
      // BOQ page is the canonical review surface. Step pills still
      // let the customer detour into 2/3/4 manually if they want.
      const clarStep = rfqData.useNix ? 4 : 5;
      const destinationStep =
        currentStep === 1 && rfqData.boqExtractionAccepted ? clarStep : currentStep + 1;
      // v1.4.3: silent server-side save on every step transition for
      // authenticated users. localStorage covers per-browser durability
      // (and is updated continuously); the server save is the
      // cross-device backstop. Step-bound rather than timer-bound to
      // keep Neon write traffic minimal — at most 5–6 saves per RFQ
      // creation regardless of how long the user spends on each step.
      // Saves with the destination step so the server row reflects
      // where the user is now, matching localStorage.
      if (isAuthenticated) {
        handleSaveProgress(destinationStep).catch((err) => {
          log.warn("Step-transition server save failed (non-fatal):", err);
        });
      }
      if (currentStep === 1 && rfqData.boqExtractionAccepted) {
        setCurrentStep(clarStep);
      } else {
        originalNextStep();
      }
      scrollToTop();
    } else {
      // Scroll to the first field with an error
      const firstErrorKey = keys(errors)[0];
      scrollToFirstError(firstErrorKey);
    }
  };

  // Previous step function with scroll to top — symmetric with the
  // forward skip above. Going Back from the Clarifications page
  // jumps straight to Step 1 when the wizard is in collapsed mode.
  const handlePrevStep = () => {
    const clarStep = rfqData.useNix ? 4 : 5;
    if (currentStep === clarStep && rfqData.boqExtractionAccepted) {
      setCurrentStep(1);
    } else if (currentStep === 3 && rfqData.boqExtractionAccepted) {
      // Customer manually detoured back into Step 3 — keep the
      // legacy 3 → 1 jump so they don't get trapped on Specs.
      setCurrentStep(1);
    } else {
      prevStep();
    }
    scrollToTop();
  };

  // Next step function (no validation) - used to go from Review to BOQ.
  // Persists destination step server-side so authenticated drafts
  // track wizard progress instead of being frozen at the row's
  // creation step.
  const handleNextStep = () => {
    const destinationStep = currentStep + 1;
    if (isAuthenticated) {
      handleSaveProgress(destinationStep).catch((err) => {
        log.warn("Step-transition server save failed (non-fatal):", err);
      });
    }
    setCurrentStep(destinationStep);
    scrollToTop();
  };

  // Step click handler with scroll to top — used by the bottom
  // stepper pills. Mirrors the Next button: silent server save
  // to the destination step for authenticated users so the row
  // stays aligned with localStorage when the user jumps around.
  const handleStepClick = (stepNumber: number) => {
    if (isAuthenticated && stepNumber !== currentStep) {
      handleSaveProgress(stepNumber).catch((err) => {
        log.warn("Stepper jump server save failed (non-fatal):", err);
      });
    }
    setCurrentStep(stepNumber);
    scrollToTop();
  };

  // Auto-generate client item numbers based on customer name for ALL item types
  // Track which items we've already auto-numbered to avoid infinite loops
  const autoNumberedItemsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (rfqData.customerName && rfqData.items) {
      const itemsNeedingNumbers = rfqData.items.filter((entry: any) => {
        const clientItemNumber = entry.clientItemNumber;
        return (
          (!clientItemNumber || clientItemNumber.trim() === "") &&
          !autoNumberedItemsRef.current.has(entry.id)
        );
      });
      if (itemsNeedingNumbers.length > 0) {
        itemsNeedingNumbers.forEach((entry: any) => {
          const index = rfqData.items.findIndex((e: any) => e.id === entry.id);
          const autoGenNumber = generateClientItemNumber(rfqData.customerName, index + 1);
          autoNumberedItemsRef.current.add(entry.id);
          updateItem(entry.id, { clientItemNumber: autoGenNumber });
        });
      }
    }
  }, [rfqData.items, rfqData.customerName, updateItem]);

  const { handleCalculateAll, handleCalculateBend, handleCalculateFitting } =
    useOrchestratorCalculations({
      allWeights,
      masterData,
      nbToOdMap,
      rfqDataRef,
      totalWeight,
      updateEntryCalculation,
      updateItem,
      updateStraightPipeEntry,
    });

  const isNixExtractedItem = (item: PipeItem | undefined): boolean => {
    return item?.notes?.includes("Extracted by Nix") || false;
  };

  const trackNixCorrection = async (
    item: PipeItem,
    fieldName: string,
    originalValue: any,
    newValue: any,
  ) => {
    if (originalValue === newValue) return;
    if (!isNixExtractedItem(item)) return;

    try {
      const rawDescription = item.description;
      await nixApi.submitCorrection({
        extractionId: nixExtractionId || undefined,
        itemDescription: rawDescription || `${item.itemType} item`,
        fieldName,
        originalValue,
        correctedValue: newValue,
      });
      log.debug(`🤖 Nix learned: ${fieldName} changed from "${originalValue}" to "${newValue}"`);
    } catch (error) {
      log.warn("🤖 Failed to record Nix correction:", error);
    }
  };

  const handleUpdateEntry = useCallback(
    (id: string, updates: any) => {
      log.info(
        `📝 handleUpdateEntry CALLED - id: ${id}, updates keys: ${keys(updates).join(", ")}`,
      );
      const entry = rfqDataRef.current.items.find((e) => e.id === id);

      if (entry && isNixExtractedItem(entry) && updates.specs) {
        const fieldsToTrack = [
          "nominalBoreMm",
          "nominalDiameterMm",
          "scheduleNumber",
          "wallThicknessMm",
          "pipeEndConfiguration",
          "bendType",
          "bendDegrees",
          "fittingType",
        ];
        const rawSpecs = entry.specs;
        const currentSpecs = rawSpecs || {};

        fieldsToTrack.forEach((field) => {
          if (
            updates.specs[field] !== undefined &&
            updates.specs[field] !== (currentSpecs as any)[field]
          ) {
            trackNixCorrection(entry, field, (currentSpecs as any)[field], updates.specs[field]);
          }
        });
      }

      if (entry?.itemType === "bend" || entry?.itemType === "fitting") {
        updateItem(id, updates);
      } else {
        updateStraightPipeEntry(id, updates);
      }
    },
    [updateItem, updateStraightPipeEntry],
  );

  // State for save progress feedback
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Pre-quote clarifications metadata. BOQStep computes omitted ids
  // independently from the live items + uploaded files (so jumping
  // straight to BOQ via the step pill still applies the omissions),
  // but it reads clarificationsSkipped from this state to drive the
  // banner styling — amber when the customer explicitly skipped,
  // neutral when they jumped here without visiting Step 5.
  const [clarificationsSkipped, setClarificationsSkipped] = useState(false);

  const handleClarificationsProceed = useCallback(
    (_ids: Set<string>, skipped: boolean) => {
      setClarificationsSkipped(skipped);
      handleNextStep();
    },
    [handleNextStep],
  );

  // Save progress handler - saves current RFQ data to server
  const handleSaveProgress = async (stepOverride?: number) => {
    log.debug("💾 handleSaveProgress called");
    log.debug("💾 rfqData.projectType:", rfqData.projectType);
    log.debug("💾 rfqData.requiredProducts:", rfqData.requiredProducts);
    log.debug("💾 rfqData.skipDocuments:", rfqData.skipDocuments);
    log.debug("💾 rfqData.latitude:", rfqData.latitude);
    log.debug("💾 rfqData.longitude:", rfqData.longitude);
    log.debug("💾 rfqData.globalSpecs:", rfqData.globalSpecs);

    const rawRequiredProducts2 = rfqData.requiredProducts;
    // Allow callers (Next button, stepper jumps) to persist the
    // destination step so the server row tracks where the user
    // is going, not the page they just left.
    const stepToSave = stepOverride ?? currentStep;

    // Never send a non-numeric draftId — the backend validator 400s
    // and bricks saving until storage is cleared (issue #357).
    const numericDraftId = toNumericDraftId(currentDraftId);

    const saveData = {
      draftId: numericDraftId ? numericDraftId : undefined,
      projectName: rfqData.projectName,
      currentStep: stepToSave,
      formData: {
        projectName: rfqData.projectName,
        projectType: rfqData.projectType,
        description: rfqData.description,
        customerName: rfqData.customerName,
        customerEmail: rfqData.customerEmail,
        customerPhone: rfqData.customerPhone,
        requiredDate: rfqData.requiredDate,
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
      requiredProducts: rawRequiredProducts2 || ["fabricated_steel"],
      straightPipeEntries: rfqData.items?.length > 0 ? rfqData.items : rfqData.straightPipeEntries,
      pendingDocuments: pendingDocuments.map((doc: any) => {
        const rawName = doc.name;
        const rawSize = doc.size;
        const rawType2 = doc.type;

        return {
          name: rawName || doc.file?.name,
          size: rawSize || doc.file?.size,
          type: rawType2 || doc.file?.type,
        };
      }),
    };

    setIsSavingDraft(true);
    try {
      log.debug("💾 Complete saveData being sent to API:", saveData);
      log.debug("💾 saveData.formData:", saveData.formData);
      log.debug("💾 saveData.requiredProducts:", saveData.requiredProducts);
      log.debug("💾 isAuthenticated:", isAuthenticated);

      if (!isAuthenticated) {
        // Unregistered customer - use anonymous drafts API
        if (!rfqData.customerEmail) {
          showToast("Please enter your email address to save progress", "warning");
          setIsSavingDraft(false);
          return;
        }

        const anonymousSaveData = {
          customerEmail: rfqData.customerEmail,
          projectName: rfqData.projectName,
          formData: saveData.formData,
          globalSpecs: saveData.globalSpecs,
          requiredProducts: saveData.requiredProducts,
          entries: saveData.straightPipeEntries,
          currentStep: saveData.currentStep,
        };

        log.debug(
          "📤 Sending anonymous draft to server:",
          JSON.stringify(anonymousSaveData, null, 2),
        );
        const result = await anonymousDraftsApi.save(anonymousSaveData);
        log.debug("✅ Anonymous draft saved:", result);

        // Save to localStorage as backup
        localStorage.setItem(
          "annix_rfq_draft",
          JSON.stringify({
            ...saveData,
            savedAt: nowISO(),
          }),
        );

        // Send recovery email
        try {
          await anonymousDraftsApi.requestRecoveryEmail(rfqData.customerEmail);
          log.debug("✅ Recovery email sent to:", rfqData.customerEmail);
          showToast(`Progress saved! Recovery link sent to ${rfqData.customerEmail}`, "success");
        } catch (emailError) {
          log.warn("Failed to send recovery email:", emailError);
          showToast("Progress saved locally", "success");
        }

        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 5000);
        return;
      }

      // Authenticated user - use regular drafts API
      const result = isEditing
        ? await adminApiClient.saveDraft(saveData)
        : await draftsApi.save(saveData);

      // Update draft info. Coerce the id — Mongoose's `id` virtual
      // returns a string, and a string here 400s every later save.
      const resultDraftId = toNumericDraftId(result.id);
      setCurrentDraftId(resultDraftId);
      setDraftNumber(result.draftNumber);

      // Also save to localStorage as backup. Use the server's
      // authoritative id/number rather than saveData (whose
      // draftId snapshotted currentDraftId BEFORE the response
      // came back — undefined on first save).
      localStorage.setItem(
        "annix_rfq_draft",
        JSON.stringify({
          ...saveData,
          draftId: resultDraftId,
          draftNumber: result.draftNumber,
          savedAt: nowISO(),
        }),
      );

      // Show confirmation
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 5000);

      log.debug(`✅ RFQ progress saved as ${result.draftNumber}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("converted to an RFQ")) {
        log.info("Draft has been converted to RFQ - clearing draft state");
        setCurrentDraftId(null);
        setDraftNumber(null);
        localStorage.removeItem("annix_rfq_draft");
        return;
      }

      const isAuthError =
        error instanceof SessionExpiredError ||
        errorMessage.includes("Authentication required") ||
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("401");

      if (isAuthError) {
        try {
          localStorage.setItem(
            "annix_rfq_draft",
            JSON.stringify({
              ...saveData,
              savedAt: nowISO(),
            }),
          );
          setShowSaveConfirmation(true);
          setTimeout(() => setShowSaveConfirmation(false), 3000);
          log.debug("✅ RFQ progress saved to localStorage (not authenticated)");
        } catch (e) {
          log.error("Failed to save to localStorage:", e);
        }
        return;
      }

      log.error("Failed to save progress:", error);

      try {
        localStorage.setItem(
          "annix_rfq_draft",
          JSON.stringify({
            ...saveData,
            savedAt: nowISO(),
          }),
        );
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 3000);
        log.debug("✅ RFQ progress saved to localStorage (server unavailable)");
        showToast("Progress saved locally. Will sync when connection restored.", "info");
      } catch (e) {
        showToast("Failed to save progress. Please try again.", "error");
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    // Client-side double-submit guard. sessionStorage survives
    // HMR (which resets React state), so a re-mount of the
    // orchestrator while a submit is in flight can't quietly
    // re-fire from a stale click. The backend's idempotency
    // key (rfq.submissionId) is the authoritative dedupe; this
    // is the friendly client-side belt.
    const SUBMIT_GUARD_KEY = "rfq_submit_in_flight";
    const inFlightSessionId =
      // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
      typeof window !== "undefined" ? sessionStorage.getItem(SUBMIT_GUARD_KEY) : null;
    if (inFlightSessionId) {
      showToast(
        "A submission is already in progress for this RFQ. Please wait for it to complete.",
        "warning",
      );
      return;
    }
    // Generate one idempotency key per submit attempt. Reused
    // automatically by any backend dedupe path if the request
    // gets retried by the dev proxy or by the user.
    const submissionId = crypto.randomUUID();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SUBMIT_GUARD_KEY, submissionId);
    }

    setIsSubmitting(true);
    setValidationErrors({});
    const g = resolveGlobalSpecsOverrides(rfqData.globalSpecs);

    try {
      const rawItems2 = rfqData.items;
      const rawStraightPipeEntries2 = rfqData.straightPipeEntries;
      const allItems = rawItems2 || rawStraightPipeEntries2 || [];
      setSubmissionItemCount(allItems.length);
      const validationError = validateItemsForSubmission(allItems, "submitting");
      if (validationError) {
        setValidationErrors({ submit: validationError });
        showToast(validationError, "error");
        setIsSubmitting(false);
        return;
      }
      const uncalcCount = countUncalculatedItems(allItems);
      if (uncalcCount > 0) {
        showToast(
          `Submitting with ${uncalcCount} item${uncalcCount === 1 ? "" : "s"} lacking weight calculations — they will show 0 kg in the BOQ.`,
          "info",
        );
      }
      const droppedMiscCount = countDroppedMiscItems(allItems);
      if (droppedMiscCount > 0) {
        showToast(
          `Skipping ${droppedMiscCount} unclassified item${droppedMiscCount === 1 ? "" : "s"} (no backend item type) — these will not appear in the RFQ.`,
          "info",
        );
      }

      const { unifiedRfqApi } = await import("@/app/lib/api/client");
      const unifiedItems = allItems
        .map((entry: any) => mapItemToUnified(entry, g, rfqData.globalSpecs))
        .filter((it: any) => it !== null);
      const unifiedPayload = buildRfqPayload(rfqData, unifiedItems, submissionId);

      log.debug("Submitting unified RFQ payload:", unifiedPayload);
      const result = await unifiedRfqApi.create(unifiedPayload);
      log.debug("Unified RFQ created:", result);

      if ((pendingDocuments.length > 0 || pendingTenderDocuments.length > 0) && result.rfq?.id) {
        const rfqId = result.rfq.id;
        const allDocuments = [...pendingDocuments, ...pendingTenderDocuments];
        let failedCount = 0;
        for (const doc of allDocuments) {
          try {
            await rfqDocumentApi.upload(rfqId, doc.file);
          } catch (uploadError) {
            failedCount++;
            log.error(`Failed to upload ${doc.file.name}:`, uploadError);
          }
        }
        if (failedCount > 0) {
          showToast(
            `${failedCount} of ${allDocuments.length} document(s) failed to upload. Please re-upload from the RFQ detail page.`,
            "error",
          );
        }
        setPendingDocuments([]);
        setPendingTenderDocuments([]);
      }

      if (result.rfq?.id) {
        try {
          await submitBoqForRfq(
            result.rfq.id,
            allItems,
            rfqData,
            masterData,
            allWeights,
            allBnw,
            allGaskets,
            boqApi,
          );
        } catch (boqError) {
          log.error("Failed to create/submit BOQ:", boqError);
        }
      }

      if (currentDraftId && result.rfq?.id) {
        try {
          await draftsApi.markAsConverted(currentDraftId, result.rfq.id);
        } catch (convertError) {
          log.error("Failed to mark draft as converted:", convertError);
        }
      }

      // Submit succeeded — wipe the localStorage backup so the
      // next visit to /customer/portal/rfqs/create (whether via
      // toolbar "New RFQ", the My RFQs page, or a fresh tab)
      // starts clean instead of auto-restoring data the user has
      // already committed to a real rfq row.
      clearLocalDraft();

      const rfqNumber = result.rfq?.rfqNumber;
      showToast(
        `Success! RFQ ${rfqNumber} created with ${result.itemsCreated} item(s).`,
        "success",
      );
      const rawId = result.rfq?.id;
      onSuccess(rawId || "success");
    } catch (error: any) {
      log.error("Submission error:", error);
      const errorMessage = extractErrorMessage(error, "Failed to submit RFQ. Please try again.");
      setValidationErrors({ submit: errorMessage });
      showToast(`Submission failed: ${errorMessage}`, "error");
    } finally {
      setIsSubmitting(false);
      // Always release the guard, success or fail. The backend
      // idempotency key remains the authoritative dedupe — if a
      // proxy retry comes in after this clears, it'll still
      // match the recorded submissionId on the rfqs row.
      // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SUBMIT_GUARD_KEY);
      }
    }
  };

  const handleResubmit = async () => {
    if (!editRfqId) {
      showToast("Cannot re-submit: No RFQ ID found", "error");
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});

    const g = resolveGlobalSpecsOverrides(rfqData.globalSpecs);

    try {
      const rawItems3 = rfqData.items;
      const rawStraightPipeEntries3 = rfqData.straightPipeEntries;
      const allItems = rawItems3 || rawStraightPipeEntries3 || [];
      const validationError = validateItemsForSubmission(allItems, "re-submitting");
      if (validationError) {
        setValidationErrors({ submit: validationError });
        showToast(validationError, "error");
        setIsSubmitting(false);
        return;
      }

      const { unifiedRfqApi } = await import("@/app/lib/api/client");

      const unifiedItems = allItems
        .map((entry: any) => mapItemToUnified(entry, g, rfqData.globalSpecs))
        .filter((it: any) => it !== null);

      const unifiedPayload = buildRfqPayload(rfqData, unifiedItems);

      log.debug("Re-submitting unified RFQ payload via admin API:", unifiedPayload);

      const result = await adminApiClient.updateRfq(editRfqId, unifiedPayload);
      log.debug("✅ Unified RFQ updated successfully via admin API:", result);

      const existingBoq = await boqApi.getByRfqId(editRfqId);
      if (existingBoq) {
        const consolidatedData = buildBoqConsolidation(
          allItems,
          rfqData,
          masterData,
          allWeights,
          allBnw,
          allGaskets,
        );
        const { customerInfo, projectInfo } = buildCustomerProjectInfo(rfqData);
        await boqApi.updateSubmittedBoq(existingBoq.id, {
          boqData: consolidatedData,
          customerInfo,
          projectInfo,
        });
      } else {
        await submitBoqForRfq(
          editRfqId,
          allItems,
          rfqData,
          masterData,
          allWeights,
          allBnw,
          allGaskets,
          boqApi,
        );
      }

      showToast(
        `Success! RFQ ${result.rfq?.rfqNumber} updated with ${result.itemsUpdated} item(s). Suppliers have been notified.`,
        "success",
      );
      onSuccess(result.rfq?.id?.toString() || "success");
    } catch (error: any) {
      log.error("Re-submission error:", error);
      const errorMessage = extractErrorMessage(error, "Failed to re-submit RFQ. Please try again.");
      setValidationErrors({ submit: errorMessage });
      showToast(`Re-submission failed: ${errorMessage}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-send the BOQ to suppliers for a draft already converted to an
  // RFQ — recovers from a BOQ-distribution failure (the RFQ was
  // created but submitForQuotation threw, leaving the BOQ in draft
  // status with no supplier sections) WITHOUT creating a duplicate
  // RFQ. Skips createUnifiedRfq entirely: the RFQ already exists.
  const handleResendBoq = async () => {
    if (!convertedRfqId) {
      showToast("Cannot re-send BOQ: this draft has not been converted to an RFQ yet.", "error");
      return;
    }
    setIsSubmitting(true);
    setValidationErrors({});
    try {
      const rawItemsResend = rfqData.items;
      const rawStraightPipeEntriesResend = rfqData.straightPipeEntries;
      const allItems = rawItemsResend || rawStraightPipeEntriesResend || [];
      const consolidatedData = buildBoqConsolidation(
        allItems,
        rfqData,
        masterData,
        allWeights,
        allBnw,
        allGaskets,
      );
      const { customerInfo, projectInfo } = buildCustomerProjectInfo(rfqData);
      const existingBoq = await boqApi.getByRfqId(convertedRfqId);
      if (existingBoq) {
        // Re-run distribution on the existing BOQ — submitForQuotation
        // deletes + rebuilds sections, so this is safe to repeat.
        await boqApi.submitForQuotation(existingBoq.id, {
          boqData: consolidatedData,
          customerInfo,
          projectInfo,
        });
      } else {
        // No BOQ row at all — build one and distribute it.
        await submitBoqForRfq(
          convertedRfqId,
          allItems,
          rfqData,
          masterData,
          allWeights,
          allBnw,
          allGaskets,
          boqApi,
        );
      }
      showToast("BOQ re-sent to suppliers successfully.", "success");
    } catch (error: any) {
      log.error("Re-send BOQ error:", error);
      const errorMessage = extractErrorMessage(
        error,
        "Failed to re-send the BOQ. Please try again.",
      );
      setValidationErrors({ submit: errorMessage });
      showToast(`Re-send BOQ failed: ${errorMessage}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // When the customer has accepted a BOQ extraction the wizard
  // collapses to a 3-pill toolbar: Project Details, Clarifications,
  // BOQ. The underlying step numbers still match the full flow
  // (1, 4 or 5, 5 or 6) so all the existing case statements keep
  // working — only the toolbar display changes. Stepper clicks
  // still let the customer detour into the hidden steps if they
  // want to.
  const fullSteps = rfqData.useNix
    ? [
        {
          number: 1,
          title: "Project/RFQ Details",
          description: "Basic project and customer information",
        },
        { number: 2, title: "Items", description: "Add pipes, bends, and fittings" },
        { number: 3, title: "Review & Submit", description: "Final review and submission" },
        {
          number: 4,
          title: "Pre-Quote Clarifications",
          description: "Missing drawings + mining valve specs",
        },
        { number: 5, title: "BOQ", description: "Bill of Quantities summary" },
      ]
    : [
        {
          number: 1,
          title: "Project/RFQ Details",
          description: "Basic project and customer information",
        },
        {
          number: 2,
          title: "Specifications",
          description: "Working conditions and material specs",
        },
        { number: 3, title: "Items", description: "Add pipes, bends, and fittings" },
        { number: 4, title: "Review & Submit", description: "Final review and submission" },
        {
          number: 5,
          title: "Pre-Quote Clarifications",
          description: "Missing drawings + mining valve specs",
        },
        { number: 6, title: "BOQ", description: "Bill of Quantities summary" },
      ];

  const steps = rfqData.boqExtractionAccepted
    ? fullSteps.filter((s) => {
        // Keep Project Details, Clarifications and BOQ. Drop Specs,
        // Items and Review — they're redundant when the document
        // drop already extracted everything.
        if (s.number === 1) return true;
        const clarStep = rfqData.useNix ? 4 : 5;
        const boqStep = rfqData.useNix ? 5 : 6;
        return s.number === clarStep || s.number === boqStep;
      })
    : fullSteps;

  const renderCurrentStep = () => {
    if (rfqData.useNix) {
      switch (currentStep) {
        case 1:
          return <ProjectDetailsStep />;
        case 2:
          return (
            <ItemUploadStep
              onUpdateEntry={handleUpdateEntry}
              onCalculate={handleCalculateAll}
              onCalculateBend={handleCalculateBend}
              onCalculateFitting={handleCalculateFitting}
              fetchAvailableSchedules={fetchAvailableSchedules}
              getFilteredPressureClasses={getFilteredPressureClasses}
              onReady={rfqData.useNix ? () => nixItemsPageReady(showToast) : undefined}
            />
          );
        case 3:
          return <ReviewSubmitStep onNextStep={handleNextStep} onPrevStep={handlePrevStep} />;
        case 4:
          return (
            <PreQuoteClarificationsStep
              onPrevStep={handlePrevStep}
              onProceed={handleClarificationsProceed}
            />
          );
        case 5:
          return (
            <BOQStep
              onPrevStep={handlePrevStep}
              onSubmit={handleSubmit}
              onResubmit={handleResubmit}
              onResendBoq={convertedRfqId ? handleResendBoq : undefined}
              isEditing={isEditing}
              clarificationsSkipped={clarificationsSkipped}
            />
          );
        default:
          return null;
      }
    } else {
      switch (currentStep) {
        case 1:
          return <ProjectDetailsStep />;
        case 2:
          return <SpecificationsStep fetchAndSelectPressureClass={fetchAndSelectPressureClass} />;
        case 3:
          return (
            <ItemUploadStep
              onUpdateEntry={handleUpdateEntry}
              onCalculate={handleCalculateAll}
              onCalculateBend={handleCalculateBend}
              onCalculateFitting={handleCalculateFitting}
              fetchAvailableSchedules={fetchAvailableSchedules}
              getFilteredPressureClasses={getFilteredPressureClasses}
              onReady={rfqData.useNix ? () => nixItemsPageReady(showToast) : undefined}
            />
          );
        case 4:
          return <ReviewSubmitStep onNextStep={handleNextStep} onPrevStep={handlePrevStep} />;
        case 5:
          return (
            <PreQuoteClarificationsStep
              onPrevStep={handlePrevStep}
              onProceed={handleClarificationsProceed}
            />
          );
        case 6:
          return (
            <BOQStep
              onPrevStep={handlePrevStep}
              onSubmit={handleSubmit}
              onResubmit={handleResubmit}
              onResendBoq={convertedRfqId ? handleResendBoq : undefined}
              isEditing={isEditing}
              clarificationsSkipped={clarificationsSkipped}
            />
          );
        default:
          return null;
      }
    }
  };
  return {
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
  };
}
