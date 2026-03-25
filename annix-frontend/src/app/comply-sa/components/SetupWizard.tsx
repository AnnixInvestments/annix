"use client";

import { ArrowLeft, ArrowRight, CheckCircle, FileUp, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  INDUSTRIES,
  MONTHS,
  MUNICIPALITIES,
  PROVINCES,
  TURNOVER_OPTIONS,
  WIZARD_DOCUMENTS,
} from "@/app/comply-sa/config/onboardingConstants";
import AmixLogo from "@/app/components/AmixLogo";
import {
  useAssessCompany,
  useUpdateCompanyProfile,
  useUploadDocument,
} from "@/app/lib/query/hooks";

const TOTAL_STEPS = 5;

type DocumentFile = {
  key: string;
  file: File;
};

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex-1 flex items-center gap-2">
          <div
            className={`h-2 flex-1 rounded-full transition-colors ${
              step <= currentStep ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300 pr-4">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
          value ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : ""
          }`}
        />
      </button>
    </div>
  );
}

function DocumentCard({
  doc,
  uploadedFile,
  onFileSelect,
  onRemove,
}: {
  doc: (typeof WIZARD_DOCUMENTS)[number];
  uploadedFile: File | null;
  onFileSelect: (key: string, file: File) => void;
  onRemove: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(doc.key, file);
      }
    },
    [doc.key, onFileSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(doc.key, file);
      }
    },
    [doc.key, onFileSelect],
  );

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
        dragOver
          ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
          : uploadedFile
            ? "border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10"
            : "border-slate-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{doc.label}</h4>
            {"optional" in doc && doc.optional && (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic">Optional</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doc.description}</p>
        </div>
        {uploadedFile ? (
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <button
              type="button"
              onClick={() => onRemove(doc.key)}
              className="text-slate-400 hover:text-red-400 transition-colors"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Browse
          </button>
        )}
      </div>
      {uploadedFile && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
          {uploadedFile.name}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");

  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [financialYearEnd, setFinancialYearEnd] = useState("");

  const [handlesPersonalData, setHandlesPersonalData] = useState(false);
  const [hasPayroll, setHasPayroll] = useState(false);
  const [importsExports, setImportsExports] = useState(false);
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");

  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>([]);

  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const updateProfile = useUpdateCompanyProfile();
  const uploadDocument = useUploadDocument();
  const assessCompany = useAssessCompany();

  const isProcessing = processingStep !== null;

  function stepTitle(): string {
    if (step === 1) return "Business Details";
    if (step === 2) return "Tax Status";
    if (step === 3) return "Operations & Location";
    if (step === 4) return "Upload Documents";
    return "Processing";
  }

  function canProceed(): boolean {
    if (step === 1)
      return industry.length > 0 && employeeCount.length > 0 && annualTurnover.length > 0;
    if (step === 2) {
      if (vatRegistered) return vatNumber.trim().length > 0 && financialYearEnd.length > 0;
      return financialYearEnd.length > 0;
    }
    if (step === 3) return province.length > 0;
    if (step === 4) return true;
    return false;
  }

  function handleFileSelect(key: string, file: File) {
    setDocumentFiles((prev) => [...prev.filter((d) => d.key !== key), { key, file }]);
  }

  function handleFileRemove(key: string) {
    setDocumentFiles((prev) => prev.filter((d) => d.key !== key));
  }

  function fileForKey(key: string): File | null {
    return documentFiles.find((d) => d.key === key)?.file || null;
  }

  const municipalitiesForProvince = province ? MUNICIPALITIES[province] || [] : [];

  async function handleProcess() {
    setError(null);
    setStep(5);

    try {
      setProcessingStep("Saving business profile...");
      const selectedTurnover = TURNOVER_OPTIONS.find((t) => t.label === annualTurnover);

      await updateProfile.mutateAsync({
        industry,
        employeeCount: parseInt(employeeCount, 10),
        annualTurnover: selectedTurnover?.value || null,
        vatRegistered,
        vatNumber: vatRegistered ? vatNumber : null,
        financialYearEnd,
        handlesPersonalData,
        hasPayroll,
        importsExports,
        province,
        municipality: municipality || null,
      });
      setCompletedSteps((prev) => [...prev, "profile"]);

      if (documentFiles.length > 0) {
        setProcessingStep(`Uploading ${documentFiles.length} document(s)...`);
        const uploadPromises = documentFiles.map((doc) =>
          uploadDocument.mutateAsync({ file: doc.file }),
        );
        await Promise.all(uploadPromises);
        setCompletedSteps((prev) => [...prev, "documents"]);
      } else {
        setCompletedSteps((prev) => [...prev, "documents"]);
      }

      setProcessingStep("Running compliance assessment...");
      await assessCompany.mutateAsync();
      setCompletedSteps((prev) => [...prev, "assessment"]);

      setProcessingStep(null);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/comply-sa/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during setup");
      setProcessingStep(null);
    }
  }

  function handleNext() {
    if (step < 4) {
      setStep(step + 1);
    } else if (step === 4) {
      handleProcess();
    }
  }

  function handleBack() {
    if (step > 1 && step < 5) {
      setStep(step - 1);
    }
  }

  const inputClass =
    "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors";
  const selectClass =
    "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <AmixLogo size="sm" showText useSignatureFont />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">Welcome to Comply SA</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {step < 5 ? (
              <>
                Step {step} of {TOTAL_STEPS - 1} &mdash; {stepTitle()}
              </>
            ) : (
              "Setting up your compliance dashboard"
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-sm">
          <ProgressBar currentStep={step} />

          {step < 5 && (
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{stepTitle()}</h2>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {step === 1 && (
              <>
                <div>
                  <label className={labelClass}>Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Number of Employees</label>
                  <input
                    type="number"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 25"
                    min="1"
                  />
                </div>
                <div>
                  <label className={labelClass}>Annual Turnover</label>
                  <select
                    value={annualTurnover}
                    onChange={(e) => setAnnualTurnover(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select turnover range</option>
                    {TURNOVER_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <ToggleField
                  label="VAT Registered?"
                  value={vatRegistered}
                  onChange={setVatRegistered}
                />
                {vatRegistered && (
                  <div>
                    <label className={labelClass}>VAT Number</label>
                    <input
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      className={inputClass}
                      placeholder="4012345678"
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Financial Year-End</label>
                  <select
                    value={financialYearEnd}
                    onChange={(e) => setFinancialYearEnd(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select month</option>
                    {MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <ToggleField
                  label="Do you handle personal data (customers, employees)?"
                  value={handlesPersonalData}
                  onChange={setHandlesPersonalData}
                />
                <ToggleField
                  label="Do you have employees on payroll?"
                  value={hasPayroll}
                  onChange={setHasPayroll}
                />
                <ToggleField
                  label="Do you import or export goods?"
                  value={importsExports}
                  onChange={setImportsExports}
                />
                <div>
                  <label className={labelClass}>Province</label>
                  <select
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      setMunicipality("");
                    }}
                    className={selectClass}
                  >
                    <option value="">Select province</option>
                    {PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>
                {province && (
                  <div>
                    <label className={labelClass}>Municipality</label>
                    <select
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select municipality</option>
                      {municipalitiesForProvince.map((muni) => (
                        <option key={muni} value={muni}>
                          {muni}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Upload your key compliance documents. You can skip this step and upload later.
                </p>
                <div className="space-y-3">
                  {WIZARD_DOCUMENTS.map((doc) => (
                    <DocumentCard
                      key={doc.key}
                      doc={doc}
                      uploadedFile={fileForKey(doc.key)}
                      onFileSelect={handleFileSelect}
                      onRemove={handleFileRemove}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 5 && (
              <div className="py-8 space-y-6">
                <div className="flex justify-center">
                  {isProcessing ? (
                    <Loader2 className="h-12 w-12 text-teal-500 animate-spin" />
                  ) : error ? (
                    <X className="h-12 w-12 text-red-400" />
                  ) : (
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  )}
                </div>

                <div className="space-y-3">
                  {[
                    { key: "profile", label: "Save business profile" },
                    { key: "documents", label: `Upload documents (${documentFiles.length})` },
                    { key: "assessment", label: "Run compliance assessment" },
                  ].map((item) => {
                    const completed = completedSteps.includes(item.key);
                    const active =
                      processingStep !== null && !completed && !completedSteps.includes(item.key);
                    return (
                      <div key={item.key} className="flex items-center gap-3">
                        {completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        ) : active ? (
                          <Loader2 className="h-5 w-5 text-teal-500 animate-spin shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            completed
                              ? "text-slate-500 dark:text-slate-400"
                              : active
                                ? "text-slate-900 dark:text-white font-medium"
                                : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {!isProcessing && !error && (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    Setup complete! Redirecting to your dashboard...
                  </p>
                )}

                {error && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStep(4);
                        setCompletedSteps([]);
                      }}
                      className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                    >
                      Go back and try again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {step < 5 && (
            <div className="flex items-center justify-between mt-8">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {step === 4 ? (
                  <>
                    {documentFiles.length > 0 ? "Upload & Assess" : "Skip & Assess"}
                    <FileUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
