"use client";

import { createPortal } from "react-dom";
import AddMineModal from "@/app/components/rfq/modals/AddMineModal";
import { AutoFilledInput } from "@/app/components/rfq/shared/AutoFilledField";
import { DateInput } from "@/app/components/ui/DateInput";
import { DocumentBucket } from "@/app/components/uploads";
import {
  isProductAvailableForUnregistered,
  isProductComingSoon,
  isProjectTypeAvailableForUnregistered,
  PRODUCTS_AND_SERVICES,
  PROJECT_TYPES,
} from "@/app/lib/config/productsServices";
import { log } from "@/app/lib/logger";
import { ProjectLocationSection } from "./project-details/ProjectLocationSection";
import { RestrictionTooltip } from "./project-details/RestrictionTooltip";
import { useProjectDetailsLogic } from "./project-details/useProjectDetailsLogic";
import { UnifiedRfqDocumentBucket } from "./UnifiedRfqDocumentBucket";

export type { PendingDocument } from "@/app/lib/store/rfqWizardStore";

export default function ProjectDetailsStep() {
  const logic = useProjectDetailsLogic();
  const {
    ConfirmDialog,
    addNote,
    additionalNotes,
    boqExtractionSummary,
    commonNotes,
    customerAutoFilled,
    documentsConfirmed,
    environmentalConfirmed,
    environmentalErrors,
    errors,
    featureFlags,
    getMapConfig,
    globalSpecs,
    handleConfirmEnvironmental,
    handleConfirmLocation,
    handleEditEnvironmental,
    handleEditLocation,
    handleLocationSelect,
    handleLocationUnavailableToggle,
    handleMineCreated,
    handleMineDropdownChange,
    handleMineSelect,
    hasProjectTypeError,
    hasRequiredEnvironmentalData,
    hasRequiredLocationData,
    hideRestrictionTooltip,
    isCustomerAuthenticated,
    isEditingEnvironmental,
    isEditingLocation,
    isEnvironmentalLocked,
    isLoadingEnvironmental,
    isLoadingMines,
    isLocationLocked,
    isNixProcessing,
    isUnregisteredCustomer,
    locationAutoFilled,
    locationConfirmed,
    locationSkipped,
    locationSummary,
    markAsOverridden,
    mineDataLoading,
    mines,
    nixProcessDocuments,
    nixStopUsing,
    onAddDocument,
    onRemoveDocument,
    onRemoveTenderDocument,
    onSetValidationError,
    onUpdate,
    onUpdateGlobalSpecs,
    pendingDocuments,
    pendingMineSelection,
    pendingTenderDocuments,
    projectTypeConfirmed,
    rawCustomerRfqReference,
    removeNote,
    restrictionPopup,
    rfqData,
    selectedMineId,
    setCustomerAutoFilled,
    setDocumentsConfirmed,
    setLocationAutoFilled,
    setPendingMineSelection,
    setProjectTypeConfirmed,
    setShowAddMineModal,
    setShowLocationRequiredModal,
    setShowMapPicker,
    setShowNoDocumentsPopup,
    setTenderDocumentsConfirmed,
    showAddMineModal,
    showLocationRequiredModal,
    showMapPicker,
    showNoDocumentsPopup,
    showRestrictionTooltip,
    showToast,
    skipEnvSuggestions,
    storeAddDocument,
    storeAddTenderDocument,
    tenderDocumentsConfirmed,
    updateEnvironmentalField,
    useNix,
    wasAutoFilled,
  } = logic;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
        Project/RFQ Details
      </h2>
      {/* Nix AI Assistant Active Banner */}
      {useNix && (
        <div className="mb-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Nix AI Assistant is Active
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Nix will analyze your documents to auto-populate the RFQ form
                </p>
              </div>
            </div>
            {nixStopUsing && (
              <button
                type="button"
                onClick={nixStopUsing}
                className="text-sm text-orange-700 hover:text-orange-900 underline font-medium"
              >
                Stop using Nix
              </button>
            )}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {/* Customer Information - Required fields */}
        <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Customer Information
            {isCustomerAuthenticated && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                Logged in
              </span>
            )}
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div data-field="customerName" data-nix-target="customerName">
              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Customer Name <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerName}
                onChange={(val) => onUpdate("customerName", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerName: false }))
                }
                isAutoFilled={customerAutoFilled.customerName}
                placeholder="Customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerName}</p>
              )}
            </div>

            <div data-field="customerEmail" data-nix-target="customerEmail">
              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Customer Email <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerEmail}
                onChange={(val) => onUpdate("customerEmail", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerEmail: false }))
                }
                isAutoFilled={customerAutoFilled.customerEmail}
                placeholder="email@example.com"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.customerEmail}
                </p>
              )}
            </div>

            <div data-field="customerPhone" data-nix-target="customerPhone">
              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Customer Phone <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerPhone}
                onChange={(val) => onUpdate("customerPhone", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerPhone: false }))
                }
                isAutoFilled={customerAutoFilled.customerPhone}
                placeholder="+27 11 000 0123"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.customerPhone}
                </p>
              )}
            </div>

            <div data-field="requiredDate" data-nix-target="requiredDate">
              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Required Date <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <DateInput
                value={rfqData.requiredDate}
                onChange={(value) => onUpdate("requiredDate", value)}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm"
                required
              />
              {errors.requiredDate && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.requiredDate}</p>
              )}
            </div>
          </div>

          {(() => {
            const rawAdditionalContacts = rfqData.additionalContacts;
            const additionalContactsValue = rawAdditionalContacts || "";
            return (
              <div className="mt-2" data-field="additionalContacts">
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Additional Contacts (CC)
                  <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                    — comma-separated emails of anyone who should be copied on follow-ups
                  </span>
                </label>
                <input
                  type="text"
                  value={additionalContactsValue}
                  onChange={(e) => onUpdate("additionalContacts", e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm"
                  placeholder="e.g., attie@example.com, ops@example.com"
                />
              </div>
            );
          })()}
        </div>

        {/* Drop email/BOQ first — Nix auto-fills the rest of the form. Only when the Nix tender flow is NOT enabled via project type. */}
        {!useNix && (
          <div className="mt-3 mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 mb-3 px-1 leading-relaxed">
              <span className="font-semibold">Save time:</span> drag your customer's email (.eml) or
              BOQ spreadsheet here first. Nix extracts every attachment and auto-fills Customer
              Name, Email, Phone, and RFQ Description from the email sender — you'll only need to
              confirm the rest.
            </p>
            <div>
              {isUnregisteredCustomer ? (
                <div
                  onMouseEnter={showRestrictionTooltip}
                  onMouseLeave={hideRestrictionTooltip}
                  className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-gray-400 rounded">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        RFQ Documents
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Email, BOQ, drawings and tender specs
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full font-medium">
                        Registered Users Only
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="text-center text-gray-400 dark:text-gray-500">
                      <svg
                        className="w-8 h-8 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-xs">Document upload available for registered users</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <UnifiedRfqDocumentBucket
                    pendingDocuments={pendingDocuments || []}
                    pendingTenderDocuments={pendingTenderDocuments || []}
                    onAddDocument={onAddDocument}
                    onRemoveDocument={onRemoveDocument}
                    onRemoveTenderDocument={onRemoveTenderDocument}
                    onMoveDocumentToTender={(id) => {
                      const doc = pendingDocuments.find((d) => d.id === id);
                      if (!doc) return;
                      onRemoveDocument(id);
                      storeAddTenderDocument(doc);
                    }}
                    onMoveTenderDocumentToBoq={(id) => {
                      const doc = pendingTenderDocuments.find((d) => d.id === id);
                      if (!doc) return;
                      onRemoveTenderDocument(id);
                      storeAddDocument(doc);
                    }}
                    isConfirmed={documentsConfirmed && tenderDocumentsConfirmed}
                    onConfirm={() => {
                      setDocumentsConfirmed(true);
                      setTenderDocumentsConfirmed(true);
                      // The unified Confirm is the explicit "yes, these
                      // are the right documents — proceed" commit. Mark
                      // the BOQ extraction as accepted so the
                      // orchestrator's Next handler skips Step 2
                      // (Specifications). Either this OR the
                      // Email-processed popup's Accept arm the same
                      // flag.
                      onUpdate("boqExtractionAccepted", true);
                    }}
                    onUnconfirm={() => {
                      setDocumentsConfirmed(false);
                      setTenderDocumentsConfirmed(false);
                      // Reverting Confirm should also revert the Step-2
                      // skip — the customer is signalling they want to
                      // re-review or change documents.
                      onUpdate("boqExtractionAccepted", false);
                    }}
                    onConfirmEmpty={() => setShowNoDocumentsPopup(true)}
                  />
                  {boqExtractionSummary && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900 dark:text-blue-200">
                            Nix extracted {boqExtractionSummary.itemCount} line item
                            {boqExtractionSummary.itemCount === 1 ? "" : "s"} from{" "}
                            {boqExtractionSummary.fileName}
                          </p>
                          <p className="text-blue-800 dark:text-blue-300 mt-0.5">
                            Split into {boqExtractionSummary.bundleCount} supplier bundle
                            {boqExtractionSummary.bundleCount === 1 ? "" : "s"}
                            {boqExtractionSummary.duplicateCount > 0
                              ? `; ${boqExtractionSummary.duplicateCount} duplicate group${boqExtractionSummary.duplicateCount === 1 ? "" : "s"} flagged for review`
                              : ""}
                            {boqExtractionSummary.drawingRefCount > 0
                              ? `; ${boqExtractionSummary.drawingRefCount} drawing reference${boqExtractionSummary.drawingRefCount === 1 ? "" : "s"} captured`
                              : ""}
                            .
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Your RFQ Reference, Project Name, and Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div data-field="customerRfqReference">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Your RFQ Reference <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              value={rawCustomerRfqReference || ""}
              onChange={(e) => onUpdate("customerRfqReference", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm"
              placeholder="e.g., RFQ-2025-001"
            />
            {errors.customerRfqReference && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.customerRfqReference}
              </p>
            )}
          </div>
          <div data-field="projectName" data-nix-target="projectName">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={rfqData.projectName}
              onChange={(e) => onUpdate("projectName", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm"
              placeholder="Optional project name"
            />
          </div>
          <div data-field="description" data-nix-target="description">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              RFQ Description
            </label>
            <input
              type="text"
              value={rfqData.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm"
              placeholder="Brief description of requirements"
            />
          </div>
        </div>

        {/* Project Type Selection - Compact */}
        <div
          data-field="projectType"
          data-nix-target="projectType"
          className={projectTypeConfirmed ? "opacity-75" : ""}
        >
          <label
            className={`block text-xs font-semibold mb-1 ${hasProjectTypeError ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
          >
            Project Type <span className="text-red-600 dark:text-red-400">*</span>
            {projectTypeConfirmed && (
              <span className="ml-2 text-green-600 dark:text-green-400 text-xs font-normal">
                (Locked)
              </span>
            )}
          </label>
          <div
            className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? "pointer-events-none" : ""}`}
          >
            {PROJECT_TYPES.filter(
              (type) => !featureFlags || featureFlags[type.flagKey] !== false,
            ).map((type) => {
              const isDisabledForUnregistered =
                isUnregisteredCustomer && !isProjectTypeAvailableForUnregistered(type.value);
              const isDisabled = projectTypeConfirmed || isDisabledForUnregistered;

              return (
                <label
                  key={type.value}
                  title={
                    isDisabledForUnregistered
                      ? "Register or login to access this option"
                      : undefined
                  }
                  onMouseEnter={isDisabledForUnregistered ? showRestrictionTooltip : undefined}
                  onMouseLeave={isDisabledForUnregistered ? hideRestrictionTooltip : undefined}
                  className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-colors text-sm h-10 ${
                    isDisabledForUnregistered
                      ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
                      : rfqData.projectType === type.value
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 cursor-pointer"
                        : hasProjectTypeError
                          ? "border-red-400 hover:border-red-500 cursor-pointer"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="projectType"
                    value={type.value}
                    checked={rfqData.projectType === type.value}
                    onChange={(e) => {
                      if (isDisabledForUnregistered) return;
                      const selectedType = e.target.value;
                      log.debug("🔘 Project type selected:", selectedType);
                      onUpdate("projectType", selectedType);

                      const nixProjectTypes = ["phase1", "retender", "feasibility"];
                      if (nixProjectTypes.includes(selectedType)) {
                        log.debug("🤖 Enabling Nix for tender project type");
                        onUpdate("useNix", true);
                      } else if (useNix && nixStopUsing) {
                        log.debug("🤖 Disabling Nix - switched to non-Nix project type");
                        nixStopUsing();
                      }
                    }}
                    className="sr-only"
                    disabled={isDisabled}
                  />
                  <div
                    className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${
                      isDisabledForUnregistered
                        ? "border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700"
                        : rfqData.projectType === type.value
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {rfqData.projectType === type.value && !isDisabledForUnregistered && (
                      <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                    )}
                  </div>
                  <span
                    className={`font-medium ${isDisabledForUnregistered ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
                  >
                    {type.label}
                  </span>
                  {isDisabledForUnregistered && (
                    <svg
                      className="w-3 h-3 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
          {errors.projectType && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.projectType}</p>
          )}
        </div>

        {/* Required Products/Services Selection - Hidden when using Nix */}
        {!useNix && (
          <div
            data-field="requiredProducts"
            data-nix-target="requiredProducts"
            className={projectTypeConfirmed ? "opacity-75" : ""}
          >
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Required Products & Services <span className="text-red-600 dark:text-red-400">*</span>
              {projectTypeConfirmed && (
                <span className="ml-2 text-green-600 dark:text-green-400 text-xs font-normal">
                  (Locked)
                </span>
              )}
            </label>
            <div
              className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? "pointer-events-none" : ""}`}
            >
              {PRODUCTS_AND_SERVICES.filter(
                (product) => !featureFlags || featureFlags[product.flagKey] !== false,
              ).map((product) => {
                const isSelected = rfqData.requiredProducts?.includes(product.value);
                const isDisabledForUnregistered =
                  isUnregisteredCustomer && !isProductAvailableForUnregistered(product.value);
                const isComingSoon = isProductComingSoon(product.value);
                const isDisabled =
                  projectTypeConfirmed || isDisabledForUnregistered || isComingSoon;

                return (
                  <label
                    key={product.value}
                    title={
                      isComingSoon
                        ? "Coming soon - this product/service is not yet available"
                        : isDisabledForUnregistered
                          ? "Register or login to access this product/service"
                          : product.description
                    }
                    onMouseEnter={
                      isDisabledForUnregistered && !isComingSoon
                        ? showRestrictionTooltip
                        : undefined
                    }
                    onMouseLeave={
                      isDisabledForUnregistered && !isComingSoon
                        ? hideRestrictionTooltip
                        : undefined
                    }
                    className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-all text-xs h-10 ${
                      isComingSoon
                        ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-not-allowed opacity-60"
                        : isDisabledForUnregistered
                          ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
                          : isSelected
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 cursor-pointer"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-300 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected && !isDisabledForUnregistered && !isComingSoon}
                      onChange={(e) => {
                        if (isDisabledForUnregistered || isComingSoon) return;
                        const rawRequiredProducts = rfqData.requiredProducts;
                        const currentProducts = rawRequiredProducts || [];
                        let newProducts: string[];
                        if (e.target.checked) {
                          newProducts = [...currentProducts, product.value];
                        } else {
                          newProducts = currentProducts.filter((p: string) => p !== product.value);
                        }
                        log.debug("☑️ Required products updated:", newProducts);
                        onUpdate("requiredProducts", newProducts);
                      }}
                      className="sr-only"
                      disabled={isDisabled}
                    />
                    <div
                      className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                        isComingSoon || isDisabledForUnregistered
                          ? "border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700"
                          : isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && !isDisabledForUnregistered && !isComingSoon && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className={isComingSoon || isDisabledForUnregistered ? "grayscale" : ""}>
                      {product.icon}
                    </span>
                    <span
                      className={`font-medium ${isComingSoon || isDisabledForUnregistered ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
                    >
                      {product.label}
                    </span>
                    {isComingSoon && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0 italic">
                        Soon
                      </span>
                    )}
                    {isDisabledForUnregistered && !isComingSoon && (
                      <svg
                        className="w-3 h-3 text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
            {errors.requiredProducts && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.requiredProducts}
              </p>
            )}
          </div>
        )}

        {/* Project Type & Products Confirmation Button - Hidden when using Nix */}
        {!useNix && (
          <div className="flex justify-end">
            {!projectTypeConfirmed ? (
              <button
                type="button"
                onClick={() => {
                  if (!rfqData.projectType) {
                    onSetValidationError(
                      "projectType",
                      "Please select a Project Type before confirming.",
                    );
                    return;
                  }
                  if (!rfqData.requiredProducts || rfqData.requiredProducts.length === 0) {
                    onSetValidationError(
                      "requiredProducts",
                      "Please select at least one Required Product/Service before confirming.",
                    );
                    return;
                  }
                  onSetValidationError("projectType", null);
                  onSetValidationError("requiredProducts", null);
                  log.debug("✅ Project type & products confirmed:", {
                    projectType: rfqData.projectType,
                    requiredProducts: rfqData.requiredProducts,
                  });
                  setProjectTypeConfirmed(true);
                }}
                disabled={
                  !rfqData.projectType ||
                  !rfqData.requiredProducts ||
                  rfqData.requiredProducts.length === 0
                }
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
              >
                ✓ Confirm Project Type & Products
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Project Type & Products Confirmed
                </span>
                <button
                  type="button"
                  onClick={() => setProjectTypeConfirmed(false)}
                  className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Additional Notes - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Quick Notes
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addNote(e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm"
            >
              <option value="">Add common note...</option>
              {commonNotes.map((note, index) => (
                <option key={index} value={note} disabled={additionalNotes.includes(note)}>
                  {note}
                </option>
              ))}
            </select>
            {additionalNotes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {additionalNotes.map((note, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded text-xs"
                  >
                    {note.substring(0, 20)}...
                    <button
                      type="button"
                      onClick={() => removeNote(note)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div data-nix-target="notes">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Custom Notes
            </label>
            <textarea
              value={rfqData.notes}
              onChange={(e) => onUpdate("notes", e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm"
              placeholder="Additional requirements..."
            />
          </div>
        </div>

        {/* Document Upload - Moved above Project Location when Nix is enabled */}
        {useNix && (
          <DocumentBucket
            id="rfq-nix-documents"
            title="Upload Documents for Nix"
            subtitle="Tender documents and drawings for AI analysis"
            tone="purple"
            documents={pendingDocuments || []}
            onAddDocument={onAddDocument}
            onRemoveDocument={onRemoveDocument}
            isConfirmed={documentsConfirmed}
            onConfirm={() => {
              setDocumentsConfirmed(true);
              nixProcessDocuments(showToast);
            }}
            onUnconfirm={() => setDocumentsConfirmed(false)}
            onConfirmEmpty={() => setShowNoDocumentsPopup(true)}
            isProcessing={isNixProcessing}
            processingLabel="Nix is reading..."
            confirmLabel="Confirm & Let Nix Read"
          />
        )}

        {/* Project Location - Compact */}
        <ProjectLocationSection logic={logic} />
      </div>
      {/* No Documents Confirmation Popup */}
      {showNoDocumentsPopup && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                No Documents Uploaded
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't uploaded any supporting documents. Documents such as specifications,
              drawings, or requirements help suppliers provide accurate quotes.
            </p>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
              Would you like to proceed without uploading documents?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  log.debug("📄 User confirmed: Skip documents");
                  setShowNoDocumentsPopup(false);
                  setDocumentsConfirmed(true);
                  onUpdate("skipDocuments", true);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                Proceed Without Documents
              </button>
              <button
                type="button"
                onClick={() => setShowNoDocumentsPopup(false)}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Mine Modal */}
      <AddMineModal
        isOpen={showAddMineModal}
        onClose={() => setShowAddMineModal(false)}
        onMineCreated={handleMineCreated}
      />
      {/* Restriction Popup for Unregistered Customers */}
      {restrictionPopup && <RestrictionTooltip position={restrictionPopup} />}
      {ConfirmDialog}
      {showLocationRequiredModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-required-title"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-md" />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3
                      id="location-required-title"
                      className="text-base font-semibold text-gray-900 dark:text-gray-100"
                    >
                      Project location needed
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      We couldn't detect a project location from your email or BOQ. Pick a SA mine
                      from the list (auto-fills latitude / longitude / region / address) — or close
                      this and use the manual fields and Pick on Map button further down.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="location-required-mine-select"
                    className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
                  >
                    Quick select: SA Mine
                  </label>
                  <select
                    id="location-required-mine-select"
                    value={pendingMineSelection ?? ""}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const mineId = rawValue ? Number.parseInt(rawValue, 10) : null;
                      setPendingMineSelection(mineId);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a mine --</option>
                    {mines.map((mine) => (
                      <option key={mine.id} value={mine.id}>
                        {mine.mineName}
                        {mine.operatingCompany ? ` (${mine.operatingCompany})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationRequiredModal(false);
                      setPendingMineSelection(null);
                      setShowAddMineModal(true);
                    }}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 underline"
                  >
                    Mine not in the list? Add it
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationRequiredModal(false);
                    setPendingMineSelection(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                >
                  Fill in manually
                </button>
                <button
                  type="button"
                  disabled={pendingMineSelection === null}
                  onClick={async () => {
                    const mineId = pendingMineSelection;
                    if (mineId === null) return;
                    setShowLocationRequiredModal(false);
                    setPendingMineSelection(null);
                    await handleMineSelect(mineId);
                  }}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    pendingMineSelection === null
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Accept this location
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
