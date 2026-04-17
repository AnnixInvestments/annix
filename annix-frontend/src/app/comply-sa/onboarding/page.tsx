"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  INDUSTRIES,
  MONTHS,
  MUNICIPALITIES,
  PROVINCES,
  TURNOVER_OPTIONS,
} from "@/app/comply-sa/config/onboardingConstants";
import { assessCompany, updateCompanyProfile } from "@/app/comply-sa/lib/api";
import AmixLogo from "@/app/components/AmixLogo";

const TOTAL_STEPS = 4;

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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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

  function stepTitle(): string {
    if (step === 1) return "Business Details";
    if (step === 2) return "Tax Status";
    if (step === 3) return "Operations";
    return "Location";
  }

  function canProceed(): boolean {
    if (step === 1)
      return industry.length > 0 && employeeCount.length > 0 && annualTurnover.length > 0;
    if (step === 2) {
      if (vatRegistered) return vatNumber.trim().length > 0 && financialYearEnd.length > 0;
      return financialYearEnd.length > 0;
    }
    if (step === 3) return true;
    return province.length > 0;
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    try {
      const selectedTurnover = TURNOVER_OPTIONS.find((t) => t.label === annualTurnover);
      const turnoverValue = selectedTurnover?.value;

      await updateCompanyProfile({
        industry,
        employeeCount: parseInt(employeeCount, 10),
        annualTurnover: turnoverValue || null,
        vatRegistered,
        vatNumber: vatRegistered ? vatNumber : null,
        financialYearEnd,
        handlesPersonalData,
        hasPayroll,
        importsExports,
        province,
        municipality: municipality || null,
      });

      await assessCompany();
      router.push("/comply-sa/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      setLoading(false);
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  const provinceMunicipalities = province ? MUNICIPALITIES[province] : null;
  const municipalitiesForProvince = provinceMunicipalities || [];

  const inputClass =
    "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors";
  const selectClass =
    "w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <AmixLogo size="sm" showText useSignatureFont />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-sm">
          <ProgressBar currentStep={step} />

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{stepTitle()}</h2>

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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    VAT Registered?
                  </label>
                  <button
                    type="button"
                    onClick={() => setVatRegistered(!vatRegistered)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      vatRegistered ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        vatRegistered ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
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
              </>
            )}

            {step === 4 && (
              <>
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
          </div>

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
              disabled={!canProceed() || loading}
              className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              {step === TOTAL_STEPS ? (
                <>
                  {loading ? "Saving..." : "Complete Setup"}
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
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
