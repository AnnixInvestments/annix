"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CurrencySelect, DEFAULT_CURRENCY } from "@/app/components/ui/CurrencySelect";
import { useSupplierAuth } from "@/app/context/SupplierAuthContext";
import { type SupplierCompanyDto, supplierPortalApi } from "@/app/lib/api/supplierApi";
import { PRODUCTS_AND_SERVICES } from "@/app/lib/config/productsServices";
import { currencyCodeForCountry } from "@/app/lib/currencies";
import {
  useSupplierCapabilities,
  useSupplierOnboardingStatus,
  useSupplierProfile,
} from "@/app/lib/query/hooks";

const initialCompanyData: SupplierCompanyDto = {
  legalName: "",
  tradingName: "",
  registrationNumber: "",
  taxNumber: "",
  vatNumber: "",
  streetAddress: "",
  addressLine2: "",
  city: "",
  provinceState: "",
  postalCode: "",
  country: "South Africa",
  currencyCode: DEFAULT_CURRENCY,
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryPhone: "",
  faxNumber: "",
  generalEmail: "",
  website: "",
  operationalRegions: [],
  industryType: "",
  companySize: undefined,
};

const regions = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

const industries = [
  "Manufacturing",
  "Wholesale",
  "Retail",
  "Services",
  "Technology",
  "Construction",
  "Agriculture",
  "Mining",
  "Transport & Logistics",
  "Other",
];

const companySizes = [
  { value: "micro", label: "Micro (1-10 employees)" },
  { value: "small", label: "Small (11-50 employees)" },
  { value: "medium", label: "Medium (51-250 employees)" },
  { value: "large", label: "Large (251-1000 employees)" },
  { value: "enterprise", label: "Enterprise (1000+ employees)" },
];

export default function SupplierOnboardingPage() {
  const router = useRouter();
  const { refreshDashboard } = useSupplierAuth();
  const onboardingQuery = useSupplierOnboardingStatus();
  const profileQuery = useSupplierProfile();
  const capabilitiesQuery = useSupplierCapabilities();

  const onboardingStatus = onboardingQuery.data ?? null;

  const [step, setStep] = useState(1);
  const [companyData, setCompanyData] = useState<SupplierCompanyDto>(initialCompanyData);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profileQuery.data?.company) {
      setCompanyData({
        ...initialCompanyData,
        ...profileQuery.data.company,
      });
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (capabilitiesQuery.data?.capabilities) {
      setSelectedCapabilities(capabilitiesQuery.data.capabilities);
    }
  }, [capabilitiesQuery.data]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setCompanyData((prev) => {
      const updates: Partial<SupplierCompanyDto> = { [name]: value };
      if (name === "country") {
        const suggestedCurrency = currencyCodeForCountry(value);
        if (suggestedCurrency) {
          updates.currencyCode = suggestedCurrency;
        }
      }
      return { ...prev, ...updates };
    });
  };

  const handleRegionToggle = (region: string) => {
    setCompanyData((prev) => ({
      ...prev,
      operationalRegions: prev.operationalRegions?.includes(region)
        ? prev.operationalRegions.filter((r) => r !== region)
        : [...(prev.operationalRegions || []), region],
    }));
  };

  const handleCapabilityToggle = (capability: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capability) ? prev.filter((c) => c !== capability) : [...prev, capability],
    );
  };

  const handleSave = async (navigateToDocuments = false) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Strip out database-only fields before sending
      const { id, createdAt, updatedAt, ...companyDataToSave } = companyData as any;

      // Save company details
      await supplierPortalApi.saveCompanyDetails(companyDataToSave);

      // Save capabilities if on step 5 or if any are selected
      if (selectedCapabilities.length > 0) {
        await supplierPortalApi.saveCapabilities(selectedCapabilities);
      }

      setSuccess("Details saved successfully");
      await refreshDashboard();

      // Navigate to Documents page if requested (after completing onboarding form)
      if (navigateToDocuments) {
        setTimeout(() => router.push("/supplier/portal/documents"), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await supplierPortalApi.submitOnboarding();
      setSuccess("Application submitted successfully!");
      await refreshDashboard();
      // Redirect to dashboard after a short delay
      setTimeout(() => router.push("/supplier/portal/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly =
    onboardingStatus?.status === "submitted" ||
    onboardingStatus?.status === "under_review" ||
    onboardingStatus?.status === "approved";

  // Capabilities can always be updated by approved suppliers
  const canEditCapabilities = !isReadOnly || onboardingStatus?.status === "approved";

  const [isSavingCapabilities, setIsSavingCapabilities] = useState(false);

  const handleSaveCapabilities = async () => {
    setIsSavingCapabilities(true);
    setError(null);
    setSuccess(null);

    try {
      await supplierPortalApi.saveCapabilities(selectedCapabilities);
      setSuccess("Products & Services updated successfully");
      await refreshDashboard();
      setTimeout(() => router.push("/supplier/portal/dashboard"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update capabilities");
    } finally {
      setIsSavingCapabilities(false);
    }
  };

  if (onboardingQuery.isLoading || profileQuery.isLoading || capabilitiesQuery.isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
        <p className="mt-1 text-gray-600">
          {isReadOnly
            ? "Your application is being processed. Information is read-only."
            : "Complete your company details to become an approved supplier."}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <nav className="flex items-center justify-center" aria-label="Progress">
          <ol className="flex items-center space-x-4 md:space-x-6">
            {["Company Info", "Address", "Contact", "Additional", "Capabilities"].map(
              (label, idx) => {
                const stepNum = idx + 1;
                const isCurrent = step === stepNum;
                const isComplete = step > stepNum;
                return (
                  <li key={label} className="flex items-center">
                    <button
                      onClick={() => setStep(stepNum)}
                      className={`flex items-center ${isCurrent ? "font-medium" : ""}`}
                      disabled={isReadOnly}
                    >
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                          isComplete
                            ? "bg-blue-600 text-white"
                            : isCurrent
                              ? "border-2 border-blue-600 text-blue-600"
                              : "border-2 border-gray-300 text-gray-500"
                        }`}
                      >
                        {isComplete ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          stepNum
                        )}
                      </span>
                      <span className="ml-2 text-sm text-gray-700 hidden sm:inline">{label}</span>
                    </button>
                    {idx < 4 && (
                      <div className="ml-4 md:ml-6 w-8 md:w-12 h-0.5 bg-gray-200">
                        <div
                          className={`h-full ${step > stepNum ? "bg-blue-600" : "bg-gray-200"}`}
                        />
                      </div>
                    )}
                  </li>
                );
              },
            )}
          </ol>
        </nav>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Legal Entity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="legalName"
                  value={companyData.legalName}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Trading Name</label>
                <input
                  type="text"
                  name="tradingName"
                  value={companyData.tradingName || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Registration Number (CIPC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={companyData.registrationNumber}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Number</label>
                <input
                  type="text"
                  name="taxNumber"
                  value={companyData.taxNumber || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">VAT Number</label>
                <input
                  type="text"
                  name="vatNumber"
                  value={companyData.vatNumber || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Business Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  value={companyData.streetAddress}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={companyData.addressLine2 || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={companyData.city}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Province/State <span className="text-red-500">*</span>
                </label>
                <select
                  name="provinceState"
                  value={companyData.provinceState}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">Select Province</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={companyData.postalCode}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  name="country"
                  value={companyData.country || "South Africa"}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preferred Currency
                </label>
                <CurrencySelect
                  value={companyData.currencyCode || DEFAULT_CURRENCY}
                  onChange={(value) => setCompanyData((prev) => ({ ...prev, currencyCode: value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Primary Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="primaryContactName"
                  value={companyData.primaryContactName}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="primaryContactEmail"
                  value={companyData.primaryContactEmail}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="primaryContactPhone"
                  value={companyData.primaryContactPhone}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Office Phone</label>
                <input
                  type="tel"
                  name="primaryPhone"
                  value={companyData.primaryPhone || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">General Email</label>
                <input
                  type="email"
                  name="generalEmail"
                  value={companyData.generalEmail || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  name="website"
                  value={companyData.website || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="https://"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Industry Type</label>
                <select
                  name="industryType"
                  value={companyData.industryType || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Industry</option>
                  {industries.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Size</label>
                <select
                  name="companySize"
                  value={companyData.companySize || ""}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Size</option>
                  {companySizes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operational Regions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {regions.map((region) => (
                    <label
                      key={region}
                      className={`flex items-center p-2 border rounded cursor-pointer ${
                        companyData.operationalRegions?.includes(region)
                          ? "bg-blue-50 border-blue-500"
                          : "bg-white border-gray-300"
                      } ${isReadOnly ? "cursor-not-allowed opacity-75" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={companyData.operationalRegions?.includes(region) || false}
                        onChange={() => handleRegionToggle(region)}
                        disabled={isReadOnly}
                        className="sr-only"
                      />
                      <span className="text-sm text-gray-700">{region}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Products & Services You Can Supply
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Select all the products and services your company can provide. This helps us match you
              with relevant RFQs.
            </p>
            {onboardingStatus?.status === "approved" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Update Your Capabilities</p>
                    <p className="text-sm text-blue-700 mt-1">
                      You can update the products and services you offer at any time. Changes will
                      affect which BOQ requests you receive.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRODUCTS_AND_SERVICES.map((item) => {
                const isSelected = selectedCapabilities.includes(item.value);
                return (
                  <label
                    key={item.value}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    } ${!canEditCapabilities ? "cursor-not-allowed opacity-75" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCapabilityToggle(item.value)}
                      disabled={!canEditCapabilities}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 mt-0.5 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium text-gray-900">{item.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${
                          item.category === "product"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {item.category === "product" ? "Product" : "Service"}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedCapabilities.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Please select at least one product or service that your company can provide.
              </p>
            )}
            {selectedCapabilities.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">
                  <strong>{selectedCapabilities.length}</strong> capability
                  {selectedCapabilities.length > 1 ? "ies" : "y"} selected
                </p>
              </div>
            )}
            {onboardingStatus?.status === "approved" && (
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSaveCapabilities}
                  disabled={isSavingCapabilities || selectedCapabilities.length === 0}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingCapabilities ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                      Updating...
                    </>
                  ) : (
                    <>
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Update Capabilities
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <div className="flex space-x-3">
            {!isReadOnly && step < 5 && (
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              !isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving || selectedCapabilities.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Complete & Continue to Documents"}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
