"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldFlowAuth } from "@/app/context/FieldFlowAuthContext";
import {
  allIndustryLabels,
  subIndustryByValue,
  subIndustryLabelsForIndustry,
} from "@/app/lib/config/fieldflow/industryOptions";
import { useCreateRepProfile, useRepProfileStatus } from "@/app/lib/query/hooks";

const productCategoryLabelsForSubIndustries = (
  industryValue: string,
  subIndustryValues: string[],
): Array<{ value: string; label: string; subIndustry: string }> => {
  const seen = new Set<string>();
  const results: Array<{ value: string; label: string; subIndustry: string }> = [];

  subIndustryValues.forEach((subIndustryValue) => {
    const subIndustry = subIndustryByValue(industryValue, subIndustryValue);
    if (subIndustry) {
      subIndustry.productCategories.forEach((p) => {
        if (!seen.has(p.value)) {
          seen.add(p.value);
          results.push({ value: p.value, label: p.label, subIndustry: subIndustryValue });
        }
      });
    }
  });

  return results;
};

type Step = "account" | "industry" | "subIndustry" | "products" | "details" | "complete";
type AuthMode = "register" | "login";

interface FormData {
  industry: string;
  subIndustries: string[];
  productCategories: string[];
  companyName: string;
  jobTitle: string;
  territoryDescription: string;
  customSearchTerms: string[];
}

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export default function RepSetupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login, register, user } = useFieldFlowAuth();
  const createProfile = useCreateRepProfile();
  const { data: profileStatus, isLoading: isCheckingStatus } = useRepProfileStatus();

  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authFormData, setAuthFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  useEffect(() => {
    if (!authLoading && !isCheckingStatus && profileStatus?.setupCompleted) {
      router.replace("/fieldflow");
    }
  }, [profileStatus, authLoading, isCheckingStatus, router]);

  const initialStep = isAuthenticated ? "industry" : "account";
  const [step, setStep] = useState<Step>(initialStep);

  useEffect(() => {
    if (!authLoading && isAuthenticated && step === "account") {
      setStep("industry");
    }
  }, [isAuthenticated, authLoading, step]);

  const [formData, setFormData] = useState<FormData>({
    industry: "",
    subIndustries: [],
    productCategories: [],
    companyName: "",
    jobTitle: "",
    territoryDescription: "",
    customSearchTerms: [],
  });
  const [customTerm, setCustomTerm] = useState("");

  const industries = allIndustryLabels();
  const subIndustries = formData.industry ? subIndustryLabelsForIndustry(formData.industry) : [];
  const productCategories =
    formData.industry && formData.subIndustries.length > 0
      ? productCategoryLabelsForSubIndustries(formData.industry, formData.subIndustries)
      : [];

  const selectedIndustryLabel = industries.find((i) => i.value === formData.industry)?.label;
  const selectedSubIndustryLabels = subIndustries
    .filter((s) => formData.subIndustries.includes(s.value))
    .map((s) => s.label);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (authMode === "register") {
        if (authFormData.password !== authFormData.confirmPassword) {
          setAuthError("Passwords do not match");
          setIsSubmitting(false);
          return;
        }
        if (authFormData.password.length < 8) {
          setAuthError("Password must be at least 8 characters");
          setIsSubmitting(false);
          return;
        }
        await register({
          email: authFormData.email,
          password: authFormData.password,
          firstName: authFormData.firstName,
          lastName: authFormData.lastName,
        });
      } else {
        await login({
          email: authFormData.email,
          password: authFormData.password,
        });
      }
      setStep("industry");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndustrySelect = (value: string) => {
    setFormData({
      ...formData,
      industry: value,
      subIndustries: [],
      productCategories: [],
    });
    setStep("subIndustry");
  };

  const handleSubIndustryToggle = (value: string) => {
    const newSubIndustries = formData.subIndustries.includes(value)
      ? formData.subIndustries.filter((s) => s !== value)
      : [...formData.subIndustries, value];
    setFormData({
      ...formData,
      subIndustries: newSubIndustries,
      productCategories: [],
    });
  };

  const handleProductToggle = (value: string) => {
    const newCategories = formData.productCategories.includes(value)
      ? formData.productCategories.filter((c) => c !== value)
      : [...formData.productCategories, value];
    setFormData({ ...formData, productCategories: newCategories });
  };

  const handleAddCustomTerm = () => {
    if (customTerm.trim() && !formData.customSearchTerms.includes(customTerm.trim())) {
      setFormData({
        ...formData,
        customSearchTerms: [...formData.customSearchTerms, customTerm.trim()],
      });
      setCustomTerm("");
    }
  };

  const handleRemoveCustomTerm = (term: string) => {
    setFormData({
      ...formData,
      customSearchTerms: formData.customSearchTerms.filter((t) => t !== term),
    });
  };

  const handleSubmit = async () => {
    try {
      await createProfile.mutateAsync({
        industry: formData.industry,
        subIndustries: formData.subIndustries,
        productCategories: formData.productCategories,
        companyName: formData.companyName || undefined,
        jobTitle: formData.jobTitle || undefined,
        territoryDescription: formData.territoryDescription || undefined,
        customSearchTerms:
          formData.customSearchTerms.length > 0 ? formData.customSearchTerms : undefined,
      });
      setStep("complete");
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  const handleFinish = () => {
    router.push("/fieldflow");
  };

  const stepNumber = {
    account: 0,
    industry: 1,
    subIndustry: 2,
    products: 3,
    details: 4,
    complete: 5,
  }[step];
  const totalSteps = isAuthenticated ? 4 : 5;
  const displayStepNumber = isAuthenticated ? stepNumber : stepNumber;

  if (authLoading || isCheckingStatus) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (profileStatus?.setupCompleted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-indigo-600 dark:bg-indigo-700">
          <h1 className="text-xl font-semibold text-white">
            {step === "account" ? "Welcome to Annix Rep" : "Set Up Your Sales Profile"}
          </h1>
          <p className="text-indigo-100 text-sm mt-1">
            {step === "account"
              ? "Create an account or sign in to get started"
              : "Tell us about what you sell so we can help you find prospects"}
          </p>
        </div>

        {step !== "account" && step !== "complete" && (
          <div className="px-6 py-2 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      num < displayStepNumber
                        ? "bg-indigo-600 text-white"
                        : num === displayStepNumber
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
                          : "bg-gray-200 text-gray-500 dark:bg-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {num < displayStepNumber ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  {num < 4 && (
                    <div
                      className={`w-12 h-0.5 ${
                        num < displayStepNumber ? "bg-indigo-600" : "bg-gray-200 dark:bg-slate-600"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6">
          {step === "account" && (
            <div>
              <div className="flex border-b border-gray-200 dark:border-slate-600 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    authMode === "register"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    authMode === "login"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleAuthSubmit}>
                {authError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {authMode === "register" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={authFormData.firstName}
                          onChange={(e) =>
                            setAuthFormData({ ...authFormData, firstName: e.target.value })
                          }
                          placeholder="John"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={authFormData.lastName}
                          onChange={(e) =>
                            setAuthFormData({ ...authFormData, lastName: e.target.value })
                          }
                          placeholder="Doe"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={authFormData.email}
                      onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                      placeholder="you@company.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={authFormData.password}
                      onChange={(e) =>
                        setAuthFormData({ ...authFormData, password: e.target.value })
                      }
                      placeholder={
                        authMode === "register" ? "Minimum 8 characters" : "Enter your password"
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  {authMode === "register" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        value={authFormData.confirmPassword}
                        onChange={(e) =>
                          setAuthFormData({ ...authFormData, confirmPassword: e.target.value })
                        }
                        placeholder="Confirm your password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting
                    ? "Please wait..."
                    : authMode === "register"
                      ? "Create Account"
                      : "Sign In"}
                </button>
              </form>
            </div>
          )}

          {step === "industry" && (
            <div>
              {user && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Welcome, {user.firstName}! Let's set up your sales profile.
                  </p>
                </div>
              )}
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                What industry do you work in?
              </h2>
              <div className="grid gap-2">
                {industries.map((industry) => (
                  <button
                    key={industry.value}
                    type="button"
                    onClick={() => handleIndustrySelect(industry.value)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-gray-900 dark:text-white"
                  >
                    {industry.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "subIndustry" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("industry")}
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 mb-4 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to industries
              </button>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                What areas of {selectedIndustryLabel}?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select all that apply</p>
              <div className="grid gap-2 mb-6">
                {subIndustries.map((sub) => (
                  <button
                    key={sub.value}
                    type="button"
                    onClick={() => handleSubIndustryToggle(sub.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      formData.subIndustries.includes(sub.value)
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "border-gray-200 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-900 dark:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{sub.label}</span>
                      {formData.subIndustries.includes(sub.value) && (
                        <svg
                          className="w-5 h-5 text-indigo-600"
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
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep("products")}
                disabled={formData.subIndustries.length === 0}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === "products" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("subIndustry")}
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 mb-4 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to sub-industries
              </button>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                What products/services do you sell?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Select all that apply in {selectedSubIndustryLabels.join(", ")}
              </p>
              <div className="grid gap-2 mb-6 max-h-96 overflow-y-auto">
                {productCategories.map((product) => (
                  <button
                    key={product.value}
                    type="button"
                    onClick={() => handleProductToggle(product.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      formData.productCategories.includes(product.value)
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "border-gray-200 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-900 dark:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{product.label}</span>
                      {formData.productCategories.includes(product.value) && (
                        <svg
                          className="w-5 h-5 text-indigo-600"
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
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep("details")}
                disabled={formData.productCategories.length === 0}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === "details" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("products")}
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 mb-4 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to products
              </button>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Additional details (optional)
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Help us understand your business better
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Your company name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="e.g., Sales Representative, Account Executive"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Territory Description
                  </label>
                  <textarea
                    value={formData.territoryDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, territoryDescription: e.target.value })
                    }
                    placeholder="e.g., Gauteng region, focusing on Johannesburg and Pretoria metro areas"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Search Terms
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Add specific terms to help find your ideal prospects
                  </p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={customTerm}
                      onChange={(e) => setCustomTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTerm();
                        }
                      }}
                      placeholder="e.g., mining contractor, steel fabricator"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTerm}
                      className="px-4 py-2 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.customSearchTerms.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.customSearchTerms.map((term) => (
                        <span
                          key={term}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                        >
                          {term}
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomTerm(term)}
                            className="hover:text-indigo-900 dark:hover:text-indigo-100"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createProfile.isPending}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createProfile.isPending ? "Saving..." : "Complete Setup"}
                </button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                You're all set!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Your profile has been saved. We'll use this information to help you find relevant
                prospects.
              </p>
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
