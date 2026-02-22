"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import AmixLogo from "@/app/components/AmixLogo";
import {
  RegistrationBottomToolbar,
  RegistrationTopToolbar,
  StepConfig,
} from "@/app/components/RegistrationToolbar";
import {
  AcceptanceCheckbox,
  DeviceInfoDisplay,
  DocumentStorageNotice,
  ErrorDisplay,
  SecurityNotice,
  TermsAndConditions,
} from "@/app/components/registration";
import { CurrencySelect, DEFAULT_CURRENCY } from "@/app/components/ui/CurrencySelect";
import { useDeviceFingerprint } from "@/app/hooks/useDeviceFingerprint";
import { CustomerCompanyDto, CustomerUserDto, customerAuthApi } from "@/app/lib/api/customerApi";
import {
  COMPANY_SIZE_OPTIONS,
  CUSTOMER_INDUSTRY_OPTIONS,
  SOUTH_AFRICAN_PROVINCES,
} from "@/app/lib/config/registration/constants";
import { currencyCodeForCountry } from "@/app/lib/currencies";
import { nowISO } from "@/app/lib/datetime";
import { log } from "@/app/lib/logger";
import { nixApi, RegistrationBatchResult } from "@/app/lib/nix/api";
import { validatePassword } from "@/app/lib/utils/passwordValidation";

type Step = "documents" | "company" | "profile" | "security" | "complete";

const REGISTRATION_STEPS: StepConfig[] = [
  { id: "documents", label: "Documents" },
  { id: "company", label: "Company" },
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
];

const INDUSTRY_OPTIONS = CUSTOMER_INDUSTRY_OPTIONS;

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { fingerprint, browserInfo, isLoading: isFingerprintLoading } = useDeviceFingerprint();

  const [currentStep, setCurrentStep] = useState<Step>("documents");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<Partial<CustomerCompanyDto>>({
    country: "South Africa",
    currencyCode: DEFAULT_CURRENCY,
  });

  const [user, setUser] = useState<Partial<CustomerUserDto>>({});

  const [security, setSecurity] = useState<{
    confirmPassword: string;
    termsAccepted: boolean;
    securityPolicyAccepted: boolean;
    documentStorageAccepted: boolean;
  }>({
    confirmPassword: "",
    termsAccepted: false,
    securityPolicyAccepted: false,
    documentStorageAccepted: false,
  });

  const [documents, setDocuments] = useState<{
    vatDocument: File | null;
    companyRegDocument: File | null;
  }>({
    vatDocument: null,
    companyRegDocument: null,
  });

  const [nixState, setNixState] = useState<{
    isVerifying: boolean;
    verificationComplete: boolean;
    batchResult: RegistrationBatchResult | null;
    autoFilledFields: string[];
  }>({
    isVerifying: false,
    verificationComplete: false,
    batchResult: null,
    autoFilledFields: [],
  });

  const [dragState, setDragState] = useState<{
    vatDragging: boolean;
    regDragging: boolean;
  }>({
    vatDragging: false,
    regDragging: false,
  });

  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [documentsSkipped, setDocumentsSkipped] = useState(false);

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    if (user.password) {
      setPasswordErrors(validatePassword(user.password));
    } else {
      setPasswordErrors([]);
    }
  }, [user.password]);

  const handleCompanyChange = (field: keyof CustomerCompanyDto, value: string) => {
    setCompany((prev) => {
      const updates: Partial<CustomerCompanyDto> = { [field]: value };
      if (field === "country") {
        const suggestedCurrency = currencyCodeForCountry(value);
        if (suggestedCurrency) updates.currencyCode = suggestedCurrency;
      }
      return { ...prev, ...updates };
    });
  };

  const handleUserChange = (field: keyof CustomerUserDto, value: string) => {
    setUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field: string, value: string | boolean) => {
    setSecurity((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileDrop = useCallback((file: File, documentType: "vat" | "registration") => {
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Please upload PDF, JPG, or PNG files.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    setError(null);
    const docKey = documentType === "vat" ? "vatDocument" : "companyRegDocument";
    setDocuments((prev) => ({ ...prev, [docKey]: file }));
    setNixState((prev) => ({ ...prev, verificationComplete: false, batchResult: null }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, documentType: "vat" | "registration") => {
    e.preventDefault();
    e.stopPropagation();
    const key = documentType === "vat" ? "vatDragging" : "regDragging";
    setDragState((prev) => ({ ...prev, [key]: true }));
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent, documentType: "vat" | "registration") => {
      e.preventDefault();
      e.stopPropagation();
      const key = documentType === "vat" ? "vatDragging" : "regDragging";
      setDragState((prev) => ({ ...prev, [key]: false }));
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, documentType: "vat" | "registration") => {
      e.preventDefault();
      e.stopPropagation();
      const key = documentType === "vat" ? "vatDragging" : "regDragging";
      setDragState((prev) => ({ ...prev, [key]: false }));

      const file = e.dataTransfer.files[0];
      if (file) handleFileDrop(file, documentType);
    },
    [handleFileDrop],
  );

  const handleConfirmAndVerify = async () => {
    if (!documents.vatDocument || !documents.companyRegDocument) return;

    setNixState((prev) => ({ ...prev, isVerifying: true }));
    setError(null);

    try {
      const files = [{ file: documents.companyRegDocument, documentType: "registration" as const }];

      const result = await nixApi.verifyRegistrationBatch(files, {});

      log.debug("=== NIX BATCH VERIFICATION RESULT ===");
      log.debug("Result:", result);
      log.debug("=====================================");

      const autoFilledFields: string[] = [];
      const companyUpdates: Partial<CustomerCompanyDto> = {};

      result.combinedAutoCorrections.forEach(({ field, value }) => {
        const stringValue = String(value);
        if (field === "companyName" || field === "legalName") {
          companyUpdates.legalName = stringValue;
          autoFilledFields.push("legalName");
        } else if (field === "vatNumber") {
          companyUpdates.vatNumber = stringValue;
          autoFilledFields.push("vatNumber");
        } else if (field === "registrationNumber") {
          companyUpdates.registrationNumber = stringValue;
          autoFilledFields.push("registrationNumber");
        } else if (field === "streetAddress") {
          companyUpdates.streetAddress = stringValue;
          autoFilledFields.push("streetAddress");
        } else if (field === "city") {
          companyUpdates.city = stringValue;
          autoFilledFields.push("city");
        } else if (field === "provinceState") {
          companyUpdates.provinceState = stringValue;
          autoFilledFields.push("provinceState");
        } else if (field === "postalCode") {
          companyUpdates.postalCode = stringValue;
          autoFilledFields.push("postalCode");
        }
      });

      result.results.forEach((docResult) => {
        docResult.fieldResults.forEach((fieldResult) => {
          if (fieldResult.extracted && !autoFilledFields.includes(fieldResult.field)) {
            const stringValue = String(fieldResult.extracted);
            if (fieldResult.field === "companyName" || fieldResult.field === "legalName") {
              companyUpdates.legalName = companyUpdates.legalName || stringValue;
              autoFilledFields.push("legalName");
            } else if (fieldResult.field === "vatNumber") {
              companyUpdates.vatNumber = companyUpdates.vatNumber || stringValue;
              autoFilledFields.push("vatNumber");
            } else if (fieldResult.field === "registrationNumber") {
              companyUpdates.registrationNumber = companyUpdates.registrationNumber || stringValue;
              autoFilledFields.push("registrationNumber");
            } else if (fieldResult.field === "streetAddress") {
              companyUpdates.streetAddress = companyUpdates.streetAddress || stringValue;
              autoFilledFields.push("streetAddress");
            } else if (fieldResult.field === "city") {
              companyUpdates.city = companyUpdates.city || stringValue;
              autoFilledFields.push("city");
            } else if (fieldResult.field === "provinceState") {
              companyUpdates.provinceState = companyUpdates.provinceState || stringValue;
              autoFilledFields.push("provinceState");
            } else if (fieldResult.field === "postalCode") {
              companyUpdates.postalCode = companyUpdates.postalCode || stringValue;
              autoFilledFields.push("postalCode");
            }
          }
        });
      });

      if (Object.keys(companyUpdates).length > 0) {
        setCompany((prev) => ({ ...prev, ...companyUpdates }));
      }

      setNixState({
        isVerifying: false,
        verificationComplete: true,
        batchResult: result,
        autoFilledFields: [...new Set(autoFilledFields)],
      });

      setCurrentStep("company");
    } catch (err) {
      log.error("Nix batch verification failed:", err);
      setError(
        err instanceof Error ? err.message : "Document verification failed. Please try again.",
      );
      setNixState((prev) => ({ ...prev, isVerifying: false }));
    }
  };

  const removeDocument = (documentType: "vat" | "registration") => {
    const docKey = documentType === "vat" ? "vatDocument" : "companyRegDocument";
    setDocuments((prev) => ({ ...prev, [docKey]: null }));
    setNixState((prev) => ({ ...prev, verificationComplete: false, batchResult: null }));
  };

  const handleSkipDocuments = () => {
    log.info("User skipped document upload during registration", {
      timestamp: nowISO(),
      userEmail: user.email || "not yet provided",
      companyName: company.legalName || "not yet provided",
    });
    setDocumentsSkipped(true);
    setShowSkipConfirmation(false);
    setCurrentStep("company");
  };

  const isDocumentsValid = (): boolean => {
    return !!(documents.vatDocument && documents.companyRegDocument);
  };

  const isCompanyValid = (): boolean => {
    return !!(
      company.legalName &&
      company.registrationNumber &&
      company.streetAddress &&
      company.city &&
      company.provinceState &&
      company.postalCode &&
      company.country &&
      company.primaryPhone
    );
  };

  const isUserValid = (): boolean => {
    return !!(user.firstName && user.lastName);
  };

  const isSecurityValid = (): boolean => {
    return !!(
      user.email &&
      user.password &&
      user.password === security.confirmPassword &&
      security.termsAccepted &&
      security.securityPolicyAccepted &&
      security.documentStorageAccepted &&
      passwordErrors.length === 0 &&
      fingerprint
    );
  };

  const canNavigateToStep = (step: string): boolean => {
    const stepIndex = REGISTRATION_STEPS.findIndex((s) => s.id === step);
    const currentIndex = REGISTRATION_STEPS.findIndex((s) => s.id === currentStep);

    if (stepIndex <= currentIndex) return true;
    if (step === "documents") return true;
    if (step === "company")
      return documentsSkipped || nixState.verificationComplete || isDocumentsValid();
    if (step === "profile") return isCompanyValid();
    if (step === "security") return isCompanyValid() && isUserValid();
    return false;
  };

  const handleStepChange = (step: string) => {
    if (canNavigateToStep(step)) {
      setCurrentStep(step as Step);
    }
  };

  const handleSubmit = async () => {
    if (!fingerprint || !browserInfo) {
      setError("Device fingerprint not available. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("company", JSON.stringify(company));
      formData.append(
        "user",
        JSON.stringify({
          firstName: user.firstName!,
          lastName: user.lastName!,
          email: user.email!,
          password: user.password!,
          jobTitle: user.jobTitle,
          directPhone: user.directPhone,
          mobilePhone: user.mobilePhone,
        }),
      );
      formData.append(
        "security",
        JSON.stringify({
          deviceFingerprint: fingerprint,
          browserInfo,
          termsAccepted: security.termsAccepted,
          securityPolicyAccepted: security.securityPolicyAccepted,
          documentStorageAccepted: security.documentStorageAccepted,
          documentsSkipped,
        }),
      );

      if (documents.vatDocument) formData.append("vatDocument", documents.vatDocument);
      if (documents.companyRegDocument)
        formData.append("companyRegDocument", documents.companyRegDocument);

      await customerAuthApi.registerWithFormData(formData);
      router.push("/customer/portal/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ["documents", "company", "profile", "security"];
    const stepLabels = ["Documents", "Company", "Profile", "Security"];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-center mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step
                    ? "border-blue-600 bg-blue-600 text-white"
                    : steps.indexOf(currentStep) > index
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 text-gray-500"
                }`}
              >
                {steps.indexOf(currentStep) > index ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 ${steps.indexOf(currentStep) > index ? "bg-green-500" : "bg-gray-300"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <React.Fragment key={`label-${step}`}>
              <div
                className={`text-xs font-medium ${currentStep === step ? "text-blue-600" : "text-gray-500"}`}
                style={{ width: index < steps.length - 1 ? "104px" : "40px", textAlign: "center" }}
              >
                {stepLabels[index]}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderDocumentUploadBox = (
    documentType: "vat" | "registration",
    label: string,
    description: string,
    file: File | null,
    isDragging: boolean,
  ) => (
    <div
      className={`border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
        isDragging
          ? "border-orange-400 bg-orange-50"
          : file
            ? "border-green-400 bg-green-50"
            : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={(e) => handleDragOver(e, documentType)}
      onDragLeave={(e) => handleDragLeave(e, documentType)}
      onDrop={(e) => handleDrop(e, documentType)}
    >
      <div className="text-center">
        {file ? (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
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
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={() => removeDocument(documentType)}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
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
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {label} <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>
            <div className="text-xs text-gray-400">
              Drag and drop or{" "}
              <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                browse
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileDrop(selectedFile, documentType);
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400">PDF, JPG, PNG up to 10MB</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Upload Your Company Documents</h2>
        <p className="text-sm text-gray-600 mt-2">
          Upload your documents and Nix AI will automatically extract your company information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderDocumentUploadBox(
          "vat",
          "VAT Registration Certificate",
          "Your official SARS VAT registration document (verified manually by admin)",
          documents.vatDocument,
          dragState.vatDragging,
        )}
        {renderDocumentUploadBox(
          "registration",
          "Company Registration (CIPC)",
          "Your official CIPC company registration certificate",
          documents.companyRegDocument,
          dragState.regDragging,
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border-2 border-orange-400">
            <Image
              src="/nix-avatar.png"
              alt="Nix AI"
              width={40}
              height={40}
              className="object-cover object-top scale-125"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-800">Nix AI Assistant</p>
            <p className="text-xs text-orange-700 mt-1">
              Once you upload both documents and click confirm, I will read your Company
              Registration document and automatically fill in your company details. Your VAT
              certificate will be verified manually by our admin team. You can review and edit the
              information on the next page.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setShowSkipConfirmation(true)}
          disabled={nixState.isVerifying}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 underline text-sm disabled:opacity-50"
        >
          Skip for now
        </button>
        <button
          onClick={handleConfirmAndVerify}
          disabled={!isDocumentsValid() || nixState.isVerifying}
          className="px-8 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
        >
          {nixState.isVerifying ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
              Nix is Reading Documents...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Confirm & Let Nix Extract Info
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderCompanyStep = () => (
    <div className="space-y-6">
      {documentsSkipped && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
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
            <div>
              <p className="text-sm font-medium text-yellow-800">Documents not uploaded</p>
              <p className="text-xs text-yellow-700 mt-1">
                You will need to upload your VAT Certificate and Company Registration documents from
                your dashboard to complete verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {nixState.autoFilledFields.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border-2 border-green-400">
              <Image
                src="/nix-avatar.png"
                alt="Nix AI"
                width={40}
                height={40}
                className="object-cover object-top scale-125"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">
                Nix extracted {nixState.autoFilledFields.length} fields from your documents
              </p>
              <p className="text-xs text-green-700 mt-1">
                I&apos;ve filled in what I found. Please review the information below and complete
                any missing fields.
              </p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Legal Company Name <span className="text-red-500">*</span>
            {nixState.autoFilledFields.includes("legalName") && (
              <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled by Nix)</span>
            )}
          </label>
          <input
            type="text"
            value={company.legalName || ""}
            onChange={(e) => handleCompanyChange("legalName", e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              nixState.autoFilledFields.includes("legalName")
                ? "border-green-300 bg-green-50"
                : "border-gray-300"
            }`}
            placeholder="Full legal company name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Trading Name</label>
          <input
            type="text"
            value={company.tradingName || ""}
            onChange={(e) => handleCompanyChange("tradingName", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Trading name (if different)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company Registration Number <span className="text-red-500">*</span>
            {nixState.autoFilledFields.includes("registrationNumber") && (
              <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled)</span>
            )}
          </label>
          <input
            type="text"
            value={company.registrationNumber || ""}
            onChange={(e) => handleCompanyChange("registrationNumber", e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              nixState.autoFilledFields.includes("registrationNumber")
                ? "border-green-300 bg-green-50"
                : "border-gray-300"
            }`}
            placeholder="e.g., 2023/123456/07"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            VAT Number
            {nixState.autoFilledFields.includes("vatNumber") && (
              <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled)</span>
            )}
          </label>
          <input
            type="text"
            value={company.vatNumber || ""}
            onChange={(e) => handleCompanyChange("vatNumber", e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              nixState.autoFilledFields.includes("vatNumber")
                ? "border-green-300 bg-green-50"
                : "border-gray-300"
            }`}
            placeholder="VAT registration number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Industry</label>
          <select
            value={company.industry || ""}
            onChange={(e) => handleCompanyChange("industry", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Company Size</label>
          <select
            value={company.companySize || ""}
            onChange={(e) => handleCompanyChange("companySize", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select size</option>
            {COMPANY_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mt-8">Address</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Street Address <span className="text-red-500">*</span>
            {nixState.autoFilledFields.includes("streetAddress") && (
              <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled)</span>
            )}
          </label>
          <input
            type="text"
            value={company.streetAddress || ""}
            onChange={(e) => handleCompanyChange("streetAddress", e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              nixState.autoFilledFields.includes("streetAddress")
                ? "border-green-300 bg-green-50"
                : "border-gray-300"
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
            {nixState.autoFilledFields.includes("city") && (
              <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled)</span>
            )}
          </label>
          <input
            type="text"
            value={company.city || ""}
            onChange={(e) => handleCompanyChange("city", e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              nixState.autoFilledFields.includes("city")
                ? "border-green-300 bg-green-50"
                : "border-gray-300"
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Province <span className="text-red-500">*</span>
            {nixState.autoFilledFields.includes("provinceState") && (
              <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled)</span>
            )}
          </label>
          <select
            value={company.provinceState || ""}
            onChange={(e) => handleCompanyChange("provinceState", e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              nixState.autoFilledFields.includes("provinceState")
                ? "border-green-300 bg-green-50"
                : "border-gray-300"
            }`}
          >
            <option value="">Select a province...</option>
            {SOUTH_AFRICAN_PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Postal Code <span className="text-red-500">*</span>
            {nixState.autoFilledFields.includes("postalCode") && (
              <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled)</span>
            )}
          </label>
          <input
            type="text"
            value={company.postalCode || ""}
            onChange={(e) => handleCompanyChange("postalCode", e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              nixState.autoFilledFields.includes("postalCode")
                ? "border-green-300 bg-green-50"
                : "border-gray-300"
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={company.country || ""}
            onChange={(e) => handleCompanyChange("country", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Preferred Currency <span className="text-red-500">*</span>
          </label>
          <CurrencySelect
            value={company.currencyCode || DEFAULT_CURRENCY}
            onChange={(value) => handleCompanyChange("currencyCode", value)}
            className="mt-1"
          />
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mt-8">Contact Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Primary Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={company.primaryPhone || ""}
            onChange={(e) => handleCompanyChange("primaryPhone", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 12 345 6789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fax Number</label>
          <input
            type="tel"
            value={company.faxNumber || ""}
            onChange={(e) => handleCompanyChange("faxNumber", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">General Email</label>
          <input
            type="email"
            value={company.generalEmail || ""}
            onChange={(e) => handleCompanyChange("generalEmail", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="info@company.co.za"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            value={company.website || ""}
            onChange={(e) => handleCompanyChange("website", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="https://www.company.co.za"
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep("documents")}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("profile")}
          disabled={!isCompanyValid()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Your Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={user.firstName || ""}
            onChange={(e) => handleUserChange("firstName", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={user.lastName || ""}
            onChange={(e) => handleUserChange("lastName", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Job Title</label>
          <input
            type="text"
            value={user.jobTitle || ""}
            onChange={(e) => handleUserChange("jobTitle", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Project Manager"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Direct Phone</label>
          <input
            type="tel"
            value={user.directPhone || ""}
            onChange={(e) => handleUserChange("directPhone", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 12 345 6789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
          <input
            type="tel"
            value={user.mobilePhone || ""}
            onChange={(e) => handleUserChange("mobilePhone", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 82 123 4567"
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep("company")}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep("security")}
          disabled={!isUserValid()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderSecurityStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Account Security</h2>

      <SecurityNotice />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={user.email || ""}
            onChange={(e) => handleUserChange("email", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="your.email@company.co.za"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={user.password || ""}
            onChange={(e) => handleUserChange("password", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {passwordErrors.length > 0 && (
            <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
              {passwordErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {user.password && passwordErrors.length === 0 && (
            <p className="mt-2 text-sm text-green-600">Password meets all requirements</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={security.confirmPassword}
            onChange={(e) => handleSecurityChange("confirmPassword", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {security.confirmPassword && user.password !== security.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">Passwords do not match</p>
          )}
        </div>

        <DeviceInfoDisplay fingerprint={fingerprint} isLoading={isFingerprintLoading} />

        <TermsAndConditions />

        <AcceptanceCheckbox
          id="terms"
          checked={security.termsAccepted}
          onChange={(checked) => handleSecurityChange("termsAccepted", checked)}
          label="I have read and agree to the Terms and Conditions"
          required
        />

        <AcceptanceCheckbox
          id="securityPolicy"
          checked={security.securityPolicyAccepted}
          onChange={(checked) => handleSecurityChange("securityPolicyAccepted", checked)}
          label="I understand and accept that my account will be locked to this device"
          required
        />

        <DocumentStorageNotice />

        <AcceptanceCheckbox
          id="documentStorage"
          checked={security.documentStorageAccepted}
          onChange={(checked) => handleSecurityChange("documentStorageAccepted", checked)}
          label="I agree to the secure storage of my documents as described above"
          required
        />
      </div>

      <ErrorDisplay error={error} />

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep("profile")}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isSecurityValid() || isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-8 h-8 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verify Your Email</h2>
      <p className="text-gray-600 mb-4">
        We&apos;ve sent a verification email to <strong>{user.email}</strong>.
      </p>
      <p className="text-gray-600 mb-8">
        Please check your inbox and click the verification link to activate your account.
      </p>
      <div className="space-y-3">
        <button
          onClick={() => router.push("/customer/login")}
          className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Login
        </button>
        <p className="text-sm text-gray-500">
          Need help?{" "}
          <a href="mailto:info@annix.co.za" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );

  return (
    <>
      <RegistrationTopToolbar title="Customer Registration" homeHref="/" />

      <div className="min-h-screen pt-20 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
              <svg
                className="w-10 h-10 text-white"
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
            </div>
            <h1 className="text-3xl font-bold text-white">Customer Registration</h1>
            <p className="mt-2 text-blue-200">Create your Annix customer portal account</p>
          </div>

          <div className="bg-white shadow rounded-lg p-8">
            {currentStep === "documents" && renderDocumentsStep()}
            {currentStep === "company" && renderCompanyStep()}
            {currentStep === "profile" && renderProfileStep()}
            {currentStep === "security" && renderSecurityStep()}
            {currentStep === "complete" && renderCompleteStep()}
          </div>

          {currentStep !== "complete" && (
            <p className="text-center mt-6 text-blue-200">
              Already have an account?{" "}
              <Link href="/customer/login" className="text-white hover:underline font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>

      {nixState.isVerifying && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div
              className="px-4 py-3 flex items-center justify-center"
              style={{ backgroundColor: "#323288" }}
            >
              <AmixLogo size="md" showText useSignatureFont />
            </div>
            <div className="px-6 py-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-orange-400 relative">
                  <Image
                    src="/nix-avatar.png"
                    alt="Nix AI Assistant"
                    width={64}
                    height={64}
                    className="object-cover object-top scale-125"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-400/20 to-transparent animate-pulse" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-lg font-bold text-gray-900">
                    Nix is Reading Your Documents...
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Extracting company information</p>
                </div>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: "70%",
                    background: "linear-gradient(90deg, #FFA500 0%, #FF8C00 50%, #FFA500 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s infinite linear",
                  }}
                />
              </div>
            </div>
            <div className="h-1" style={{ backgroundColor: "#FFA500" }} />
          </div>
          <style jsx>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}

      {showSkipConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSkipConfirmation(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-center bg-yellow-500">
              <svg
                className="w-6 h-6 text-white mr-2"
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
              <span className="text-white font-semibold">Document Upload Required</span>
            </div>
            <div className="px-6 py-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Are you sure you want to skip?
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <ul className="text-sm text-yellow-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
                    <span>
                      You will be required to upload your VAT Certificate and Company Registration
                      documents <strong>before your account can be fully verified</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
                    <span>
                      Some features may be <strong>limited</strong> until documents are uploaded and
                      verified.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
                    <span>You will need to manually enter all company information.</span>
                  </li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSkipConfirmation(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  Go Back
                </button>
                <button
                  onClick={handleSkipDocuments}
                  className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-medium"
                >
                  I Understand, Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RegistrationBottomToolbar
        steps={REGISTRATION_STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        canNavigateToStep={canNavigateToStep}
      />
    </>
  );
}
