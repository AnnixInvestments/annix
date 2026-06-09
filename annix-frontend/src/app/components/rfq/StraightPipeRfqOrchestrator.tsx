"use client";
import { keys } from "es-toolkit/compat";
import { GuidedHighlight } from "@/app/components/rfq/shared/GuidedHighlight";
import { fromISO } from "@/app/lib/datetime";
import { formatLastSaved } from "@/app/lib/hooks/useRfqDraftStorage";
import { log } from "@/app/lib/logger";
import { NixAiPopup, NixChatPanel, NixClarificationPopup, NixProcessingPopup } from "@/app/lib/nix";
import { DraftAutoSavedBadge } from "./orchestrator/components/DraftAutoSavedBadge";
import {
  type Props,
  SubmissionProgressPopup,
  useOrchestratorLogic,
} from "./orchestrator/useOrchestratorLogic";

export default function StraightPipeRfqOrchestrator(props: Props) {
  const {
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
  } = useOrchestratorLogic(props);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      <SubmissionProgressPopup visible={isSubmitting} itemCount={submissionItemCount} />
      {/* Nix AI Assistant Popup */}
      <NixAiPopup isVisible={showNixPopup} onYes={nixAccept} onNo={nixDecline} />
      {/* Nix Processing Popup - shows while extracting data */}
      <NixProcessingPopup
        isVisible={isNixProcessing}
        progress={nixProcessingProgress}
        statusMessage={nixProcessingStatus}
        estimatedTimeRemaining={nixProcessingTimeRemaining ?? undefined}
      />
      {/* Nix Clarification Popup - shows when Nix needs user input */}
      {showNixClarification && (
        <NixClarificationPopup
          clarification={rawCurrentClarificationIndex || null}
          allClarifications={nixClarifications}
          totalClarifications={nixClarifications.length}
          currentIndex={currentClarificationIndex}
          pendingDocuments={pendingDocuments}
          onSubmit={(id: number, response: string) =>
            nixSubmitClarification(id, response, showToast)
          }
          onSubmitBatch={(responses) => nixSubmitClarificationBatch(responses, showToast)}
          onSkip={(id: number) => nixSkipClarification(id, showToast)}
          onClose={nixCloseClarification}
        />
      )}
      {nixChatPanelVisible && rfqData.useNix && (
        <NixChatPanel
          sessionId={nixChatSessionId}
          rfqId={currentDraftId ?? undefined}
          currentRfqItems={rfqData.items}
          onClose={nixCloseChatPanel}
          onSessionCreated={nixSetChatSessionId}
          savedGeometry={nixChatPanelGeometry}
          onGeometryChange={nixSetChatPanelGeometry}
          portalContext="customer"
          pageContext={{
            currentPage: "RFQ Creation - Steel Pipes",
            rfqType: "Standard RFQ - Steel Pipes",
            portalContext: "customer",
          }}
        />
      )}
      {nixGuidedModeActive && rfqData.useNix && <GuidedHighlight />}
      {/* LocalStorage Draft Restoration Prompt */}
      {showDraftRestorePrompt && pendingLocalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Resume Your Draft?</h3>
                  <p className="mt-2 text-sm text-gray-300">
                    We found a saved draft from your previous session.
                  </p>
                  {pendingLocalDraft.lastSaved && (
                    <p className="mt-1 text-xs text-gray-400">
                      Last saved:{" "}
                      {formatLastSaved(fromISO(String(pendingLocalDraft.lastSaved)).toJSDate())}
                    </p>
                  )}
                  {pendingLocalDraft.rfqData?.projectName && (
                    <p className="mt-2 text-sm text-blue-300">
                      Project: {pendingLocalDraft.rfqData.projectName}
                    </p>
                  )}
                  {pendingLocalDraft.rfqData?.customerEmail && (
                    <p className="text-sm text-gray-400">
                      Email: {pendingLocalDraft.rfqData.customerEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-900/50 border-t border-slate-700">
              <button
                onClick={handleDiscardLocalDraft}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={handleRestoreLocalDraft}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
              >
                Resume Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Save Progress Dialog for Unregistered Users */}
      {showSaveProgressDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full mx-4 overflow-hidden">
            {saveProgressStep === "confirm" ? (
              <>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">Save Your Progress</h3>
                      <p className="mt-2 text-sm text-gray-300">
                        {rfqData.customerEmail
                          ? `We'll save your progress and send a recovery link to ${rfqData.customerEmail}`
                          : "Please enter your email address on the form to save your progress."}
                      </p>
                      {rfqData.projectName && (
                        <p className="mt-2 text-sm text-blue-300">Project: {rfqData.projectName}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        Your draft will be saved for 7 days. You can use the recovery link to
                        continue from any device.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 p-4 bg-slate-900/50 border-t border-slate-700">
                  <button
                    onClick={draftCloseSaveProgressDialog}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    disabled={isSavingProgress}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => draftSaveProgressToServer(showToast)}
                    disabled={!rfqData.customerEmail || isSavingProgress}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingProgress ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                        Saving...
                      </span>
                    ) : (
                      "Save & Send Link"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Progress Saved!</h3>
                    <p className="mt-2 text-sm text-gray-300">A recovery link has been sent to:</p>
                    <p className="mt-1 text-sm font-medium text-blue-300">
                      {rfqData.customerEmail}
                    </p>
                    <p className="mt-4 text-xs text-gray-400">
                      Check your inbox (and spam folder) for an email from Annix. Use the link to
                      continue your RFQ from any device within 7 days.
                    </p>
                  </div>
                </div>
                <div className="flex p-4 bg-slate-900/50 border-t border-slate-700">
                  <button
                    onClick={draftCloseSaveProgressDialog}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Save Progress Confirmation Toast */}
      {showSaveConfirmation && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div>
                <p className="font-medium">Progress Saved!</p>
                {draftNumber && (
                  <p className="text-sm text-green-100 mt-0.5">
                    Draft Number: <span className="font-mono font-bold">{draftNumber}</span>
                  </p>
                )}
              </div>
            </div>
            {draftNumber && (
              <p className="text-xs text-green-200 mt-2">
                You can resume this RFQ from your dashboard at any time.
              </p>
            )}
          </div>
        </div>
      )}
      {/* Scrollable Content - grows to fill space, with padding for fixed bottom bar */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-20">
        {/* Sticky Top Header Bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">Create RFQ</h1>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-medium text-blue-600">{rawTitle || "RFQ"}</span>
            </div>
            <div className="flex items-center gap-3">
              {draftNumber && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {draftNumber}
                </span>
              )}
              {!isAuthenticated && hasLocalDraft && (
                <DraftAutoSavedBadge lastSaved={localDraftLastSaved} />
              )}
              {!isAuthenticated && (
                <button
                  onClick={draftOpenSaveProgressDialog}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors"
                  title="Save progress and get a recovery link via email"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save Progress
                </button>
              )}
              {rfqData?.useNix && nixFormHelperMinimized && (
                <button
                  onClick={nixFormHelperReactivate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-colors"
                  title="Reopen Nix AI Assistant"
                >
                  <img src="/nix-avatar.png" alt="Nix" className="w-4 h-4 rounded-full" />
                  Open Nix
                </button>
              )}
              <div className="text-sm text-gray-500">{rawProjectName6 || "New RFQ"}</div>
              <button
                onClick={() => {
                  const isDraft = searchParams?.get("draft") || searchParams?.get("draftId");
                  log.debug("Close button clicked - isDraft:", isDraft);
                  log.debug("searchParams:", searchParams);

                  if (isDraft || isEditing) {
                    // Existing RFQ/draft: prompt only if the user made a
                    // genuine edit. userHasEdited is flipped by real user
                    // actions, never by automatic on-load mutations
                    // (weight calcs, auto item numbers, auto pressure
                    // class), so opening and closing an untouched RFQ
                    // closes silently.
                    log.info("🔍 Edit/draft dirty check:", { userHasEdited });
                    if (userHasEdited) {
                      setShowCloseConfirmation(true);
                    } else {
                      onCancel();
                    }
                  } else {
                    const rawLength6 = rfqData.items?.length;
                    const rawLength7 = rfqData.straightPipeEntries?.length;
                    const rawLength8 = rfqData.description?.trim().length;
                    const rawLength9 = rfqData.notes?.trim().length;
                    const rawLength10 = rfqData.siteAddress?.trim().length;
                    // For a new RFQ (not a draft), check if user has made any meaningful changes
                    // Skip auto-filled fields (customer name/email from profile, auto-generated project name)
                    const hasChanges =
                      // Items/entries added
                      (rawLength6 || 0) > 0 ||
                      (rawLength7 || 0) > 0 ||
                      // User-selected fields on step 1
                      (rfqData.projectType && rfqData.projectType !== "standard") ||
                      (rawLength8 || 0) > 0 ||
                      (rawLength9 || 0) > 0 ||
                      (rawLength10 || 0) > 0 ||
                      (rfqData.mineId !== undefined && rfqData.mineId !== null) ||
                      rfqData.skipDocuments === true ||
                      // User progressed to step 2+ (selected products, location, specs)
                      (currentStep > 1 &&
                        ((rfqData.requiredProducts && rfqData.requiredProducts.length > 0) ||
                          (rfqData.latitude !== undefined && rfqData.latitude !== null) ||
                          (rfqData.longitude !== undefined && rfqData.longitude !== null))) ||
                      // User progressed to step 3+ (entered specs)
                      (currentStep > 2 &&
                        rfqData.globalSpecs &&
                        keys(rfqData.globalSpecs).length > 0);

                    log.info("Dirty check - hasChanges:", hasChanges, "rfqData:", {
                      items: rfqData.items?.length,
                      straightPipes: rfqData.straightPipeEntries?.length,
                      projectType: rfqData.projectType,
                      description: rfqData.description,
                      notes: rfqData.notes,
                      currentStep,
                    });
                    if (hasChanges) {
                      log.debug("Has changes, showing confirmation modal");
                      setShowCloseConfirmation(true);
                    } else {
                      log.debug("No changes, calling onCancel");
                      onCancel();
                    }
                  }
                }}
                className="text-gray-400 hover:text-gray-600 text-xl px-2"
                title="Close RFQ"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* onInput/onChange fire from genuine user input on native
                form controls, and a click inside a Select's listbox is a
                real dropdown selection. Programmatic store writes (weight
                calcs, auto item numbers, auto spec derivations) emit none
                of these, so the RFQ is marked edited only when the user
                actually changes a value — never on load. */}
            <div
              className="px-4 py-4"
              onInput={() => {
                if (!userHasEdited) markRfqEdited();
              }}
              onChange={() => {
                if (!userHasEdited) markRfqEdited();
              }}
              onClickCapture={(e) => {
                if (userHasEdited) return;
                if ((e.target as HTMLElement).closest('[role="listbox"]')) {
                  markRfqEdited();
                }
              }}
            >
              {isLoadingMasterData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading system data...</span>
                  </div>
                </div>
              ) : (
                renderCurrentStep()
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Fixed Bottom Navigation Toolbar - always visible at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] px-4 py-3 shadow-2xl border-t border-gray-700"
        style={{ backgroundColor: "#323288" }}
      >
        <div className="flex items-center justify-between max-w-full">
          {/* Left side - Previous button */}
          <div className="w-32">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentStep === 1 ? "transparent" : "#4a4da3",
                color: "#FF8A00",
                border: "1px solid #FF8A00",
              }}
            >
              ← Previous
            </button>
          </div>

          {/* Center - Step Navigation Icons */}
          <div className="flex items-center gap-3">
            {steps.map((step, idx) => {
              // Display number = loop index + 1 so the toolbar shows
              // 1, 2, 3 even when the canonical step numbers are
              // [1, 5, 6] (collapsed mode after BOQ extraction
              // accepted). Internal navigation still uses
              // step.number so case statements stay correct.
              const displayNumber = idx + 1;
              return (
                <div key={step.number} className="flex items-center">
                  <button
                    onClick={() => handleStepClick(step.number)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor:
                        step.number === currentStep
                          ? "#FF8A00"
                          : step.number < currentStep
                            ? "#4a4da3"
                            : "transparent",
                      border:
                        step.number === currentStep
                          ? "2px solid #FF8A00"
                          : step.number < currentStep
                            ? "1px solid #4CAF50"
                            : "1px solid rgba(255, 165, 0, 0.3)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor:
                          step.number === currentStep
                            ? "#323288"
                            : step.number < currentStep
                              ? "#4CAF50"
                              : "rgba(255, 165, 0, 0.3)",
                        color: "#FFFFFF",
                      }}
                    >
                      {step.number < currentStep ? "✓" : displayNumber}
                    </div>
                    <span
                      className="text-sm font-medium hidden md:inline"
                      style={{
                        color:
                          step.number === currentStep
                            ? "#323288"
                            : step.number < currentStep
                              ? "#4CAF50"
                              : "rgba(255, 165, 0, 0.6)",
                      }}
                    >
                      {step.title}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className="w-8 h-0.5 mx-1"
                      style={{
                        backgroundColor:
                          step.number < currentStep ? "#4CAF50" : "rgba(255, 165, 0, 0.3)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side - Save Progress & Next/Submit buttons */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => handleSaveProgress()}
              disabled={isSavingDraft}
              className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#4a4da3",
                color: "#FF8A00",
                border: "1px solid #FF8A00",
              }}
            >
              {isSavingDraft ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  {draftNumber ? "Update Draft" : "Save Progress"}
                </>
              )}
            </button>
            {(() => {
              // Footer Next/Submit button rules — split out per
              // mode because Nix mode skips the Specs step. Keys:
              //
              //   <last-non-action-step  → "Next →" (orange)
              //   === clarifications     → null (the clarifications
              //                             step uses its own
              //                             Send/Skip buttons)
              //   === BOQ                → null (BOQ has its own
              //                             Submit button)
              const isNix = rfqData.useNix;
              const reviewStep = isNix ? 3 : 4;
              const clarStep = isNix ? 4 : 5;
              const boqStep = isNix ? 5 : 6;
              if (currentStep < reviewStep) {
                return (
                  <button
                    onClick={nextStep}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: "#FF8A00", color: "#323288" }}
                  >
                    Next →
                  </button>
                );
              }
              if (currentStep === reviewStep) {
                return (
                  <button
                    onClick={handleNextStep}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: "#FF8A00", color: "#323288" }}
                  >
                    Next →
                  </button>
                );
              }
              if (currentStep === clarStep || currentStep === boqStep) return null;
              return null;
            })()}
          </div>
        </div>
      </div>
      {showCloseConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-md"
            onClick={() => setShowCloseConfirmation(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-8 py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Unsaved Changes</h2>

              <p className="text-gray-600 mb-6 text-center">
                You have unsaved changes. Are you sure you want to close this RFQ?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseConfirmation(false)}
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => {
                    log.debug("Close Anyway clicked, calling onCancel()");
                    setShowCloseConfirmation(false);
                    onCancel();
                  }}
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-all duration-200"
                >
                  Close Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
