'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supplierPortalApi, SupplierCompanyDto, OnboardingStatusResponse } from '@/app/lib/api/supplierApi';
import { useSupplierAuth } from '@/app/context/SupplierAuthContext';

const initialCompanyData: SupplierCompanyDto = {
  legalName: '',
  tradingName: '',
  registrationNumber: '',
  taxNumber: '',
  vatNumber: '',
  streetAddress: '',
  addressLine2: '',
  city: '',
  provinceState: '',
  postalCode: '',
  country: 'South Africa',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  primaryPhone: '',
  faxNumber: '',
  generalEmail: '',
  website: '',
  operationalRegions: [],
  industryType: '',
  companySize: undefined,
};

const regions = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

const industries = [
  'Manufacturing',
  'Wholesale',
  'Retail',
  'Services',
  'Technology',
  'Construction',
  'Agriculture',
  'Mining',
  'Transport & Logistics',
  'Other',
];

const companySizes = [
  { value: 'micro', label: 'Micro (1-10 employees)' },
  { value: 'small', label: 'Small (11-50 employees)' },
  { value: 'medium', label: 'Medium (51-250 employees)' },
  { value: 'large', label: 'Large (251-1000 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' },
];

export default function SupplierOnboardingPage() {
  const router = useRouter();
  const { refreshDashboard } = useSupplierAuth();
  const [step, setStep] = useState(1);
  const [companyData, setCompanyData] = useState<SupplierCompanyDto>(initialCompanyData);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusData, profileData] = await Promise.all([
          supplierPortalApi.getOnboardingStatus(),
          supplierPortalApi.getProfile(),
        ]);
        setOnboardingStatus(statusData);

        // Pre-fill company data if exists
        if (profileData.company) {
          setCompanyData({
            ...initialCompanyData,
            ...profileData.company,
          });
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegionToggle = (region: string) => {
    setCompanyData((prev) => ({
      ...prev,
      operationalRegions: prev.operationalRegions?.includes(region)
        ? prev.operationalRegions.filter((r) => r !== region)
        : [...(prev.operationalRegions || []), region],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await supplierPortalApi.saveCompanyDetails(companyData);
      setSuccess('Company details saved successfully');
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await supplierPortalApi.submitOnboarding();
      setSuccess('Application submitted successfully!');
      await refreshDashboard();
      // Redirect to dashboard after a short delay
      setTimeout(() => router.push('/supplier/portal/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly =
    onboardingStatus?.status === 'submitted' ||
    onboardingStatus?.status === 'under_review' ||
    onboardingStatus?.status === 'approved';

  if (isLoading) {
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
            ? 'Your application is being processed. Information is read-only.'
            : 'Complete your company details to become an approved supplier.'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <nav className="flex items-center justify-center" aria-label="Progress">
          <ol className="flex items-center space-x-8">
            {['Company Info', 'Address', 'Contact', 'Additional'].map((label, idx) => {
              const stepNum = idx + 1;
              const isCurrent = step === stepNum;
              const isComplete = step > stepNum;
              return (
                <li key={label} className="flex items-center">
                  <button
                    onClick={() => setStep(stepNum)}
                    className={`flex items-center ${isCurrent ? 'font-medium' : ''}`}
                    disabled={isReadOnly}
                  >
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                        isComplete
                          ? 'bg-blue-600 text-white'
                          : isCurrent
                          ? 'border-2 border-blue-600 text-blue-600'
                          : 'border-2 border-gray-300 text-gray-500'
                      }`}
                    >
                      {isComplete ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </span>
                    <span className="ml-2 text-sm text-gray-700 hidden sm:inline">{label}</span>
                  </button>
                  {idx < 3 && (
                    <div className="ml-8 w-12 h-0.5 bg-gray-200">
                      <div
                        className={`h-full ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'}`}
                      />
                    </div>
                  )}
                </li>
              );
            })}
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
                  value={companyData.tradingName || ''}
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
                  value={companyData.taxNumber || ''}
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
                  value={companyData.vatNumber || ''}
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
                  value={companyData.addressLine2 || ''}
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
                  value={companyData.country || 'South Africa'}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
                  value={companyData.primaryPhone || ''}
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
                  value={companyData.generalEmail || ''}
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
                  value={companyData.website || ''}
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
                  value={companyData.industryType || ''}
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
                  value={companyData.companySize || ''}
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
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-300'
                      } ${isReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
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
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              !isReadOnly &&
              onboardingStatus?.canSubmit && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
