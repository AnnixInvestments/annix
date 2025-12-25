'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDeviceFingerprint } from '@/app/hooks/useDeviceFingerprint';
import {
  customerAuthApi,
  CustomerCompanyDto,
  CustomerUserDto,
  CustomerRegistrationDto,
} from '@/app/lib/api/customerApi';

type Step = 'company' | 'documents' | 'profile' | 'security' | 'complete';

const COMPANY_SIZE_OPTIONS = [
  { value: 'micro', label: 'Micro (1-9 employees)' },
  { value: 'small', label: 'Small (10-49 employees)' },
  { value: 'medium', label: 'Medium (50-249 employees)' },
  { value: 'large', label: 'Large (250-999 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' },
];

const INDUSTRY_OPTIONS = [
  'Mining',
  'Oil & Gas',
  'Power Generation',
  'Water Treatment',
  'Chemical Processing',
  'Manufacturing',
  'Construction',
  'Agriculture',
  'Other',
];

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { fingerprint, browserInfo, isLoading: isFingerprintLoading } = useDeviceFingerprint();

  const [currentStep, setCurrentStep] = useState<Step>('company');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company data
  const [company, setCompany] = useState<Partial<CustomerCompanyDto>>({
    country: 'South Africa',
  });

  // User data (profile + credentials)
  const [user, setUser] = useState<Partial<CustomerUserDto>>({});

  // Security/form data
  const [security, setSecurity] = useState<{
    confirmPassword: string;
    termsAccepted: boolean;
    securityPolicyAccepted: boolean;
  }>({
    confirmPassword: '',
    termsAccepted: false,
    securityPolicyAccepted: false,
  });

  // Document upload state
  const [documents, setDocuments] = useState<{
    vatDocument: File | null;
    companyRegDocument: File | null;
  }>({
    vatDocument: null,
    companyRegDocument: null,
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Validate password requirements
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 10) {
      errors.push('Password must be at least 10 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return errors;
  };

  useEffect(() => {
    if (user.password) {
      setPasswordErrors(validatePassword(user.password));
    } else {
      setPasswordErrors([]);
    }
  }, [user.password]);

  const handleCompanyChange = (field: keyof CustomerCompanyDto, value: string) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserChange = (field: keyof CustomerUserDto, value: string) => {
    setUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field: string, value: string | boolean) => {
    setSecurity((prev) => ({ ...prev, [field]: value }));
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

  const isDocumentsValid = (): boolean => {
    return !!(documents.vatDocument && documents.companyRegDocument);
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
      passwordErrors.length === 0 &&
      fingerprint
    );
  };

  const handleSubmit = async () => {
    if (!fingerprint || !browserInfo) {
      setError('Device fingerprint not available. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create FormData for file uploads
      const formData = new FormData();

      // Add company data
      formData.append('company', JSON.stringify(company));

      // Add user data
      formData.append('user', JSON.stringify({
        firstName: user.firstName!,
        lastName: user.lastName!,
        email: user.email!,
        password: user.password!,
        jobTitle: user.jobTitle,
        directPhone: user.directPhone,
        mobilePhone: user.mobilePhone,
      }));

      // Add security data
      formData.append('security', JSON.stringify({
        deviceFingerprint: fingerprint,
        browserInfo,
        termsAccepted: security.termsAccepted,
        securityPolicyAccepted: security.securityPolicyAccepted,
      }));

      // Add document files
      if (documents.vatDocument) {
        formData.append('vatDocument', documents.vatDocument);
      }
      if (documents.companyRegDocument) {
        formData.append('companyRegDocument', documents.companyRegDocument);
      }

      // Call API with FormData
      const response = await fetch('http://localhost:4001/customer/register', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      setCurrentStep('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['company', 'documents', 'profile', 'security'];
    const stepLabels = ['Company', 'Documents', 'Profile', 'Security'];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-center mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : steps.indexOf(currentStep) > index
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {steps.indexOf(currentStep) > index ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 ${
                    steps.indexOf(currentStep) > index
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <React.Fragment key={`label-${step}`}>
              <div
                className={`text-xs font-medium ${
                  currentStep === step ? 'text-blue-600' : 'text-gray-500'
                } ${index === 0 ? 'text-left' : index === steps.length - 1 ? 'text-right' : 'text-center'}`}
                style={{ width: index < steps.length - 1 ? '104px' : '40px' }}
              >
                {stepLabels[index]}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderCompanyStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Legal Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={company.legalName || ''}
            onChange={(e) => handleCompanyChange('legalName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Full legal company name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Trading Name</label>
          <input
            type="text"
            value={company.tradingName || ''}
            onChange={(e) => handleCompanyChange('tradingName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Trading name (if different)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company Registration Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={company.registrationNumber || ''}
            onChange={(e) => handleCompanyChange('registrationNumber', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., 2023/123456/07"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">VAT Number</label>
          <input
            type="text"
            value={company.vatNumber || ''}
            onChange={(e) => handleCompanyChange('vatNumber', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="VAT registration number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Industry</label>
          <select
            value={company.industry || ''}
            onChange={(e) => handleCompanyChange('industry', e.target.value)}
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
            value={company.companySize || ''}
            onChange={(e) => handleCompanyChange('companySize', e.target.value as any)}
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
          </label>
          <input
            type="text"
            value={company.streetAddress || ''}
            onChange={(e) => handleCompanyChange('streetAddress', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={company.city || ''}
            onChange={(e) => handleCompanyChange('city', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Province <span className="text-red-500">*</span>
          </label>
          <select
            value={company.provinceState || ''}
            onChange={(e) => handleCompanyChange('provinceState', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
          </label>
          <input
            type="text"
            value={company.postalCode || ''}
            onChange={(e) => handleCompanyChange('postalCode', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={company.country || ''}
            onChange={(e) => handleCompanyChange('country', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            value={company.primaryPhone || ''}
            onChange={(e) => handleCompanyChange('primaryPhone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 12 345 6789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fax Number</label>
          <input
            type="tel"
            value={company.faxNumber || ''}
            onChange={(e) => handleCompanyChange('faxNumber', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">General Email</label>
          <input
            type="email"
            value={company.generalEmail || ''}
            onChange={(e) => handleCompanyChange('generalEmail', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="info@company.co.za"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            value={company.website || ''}
            onChange={(e) => handleCompanyChange('website', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="https://www.company.co.za"
          />
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button
          onClick={() => setCurrentStep('documents')}
          disabled={!isCompanyValid()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Upload Company Documents</h2>
      <p className="text-sm text-gray-600">
        Please upload the required documents. We will verify that the information matches your company details.
      </p>

      <div className="space-y-6">
        {/* VAT Registration Document */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            VAT Registration Document <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Upload your official VAT registration certificate. We will verify the VAT number matches: {company.vatNumber || 'Not provided'}
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setDocuments((prev) => ({ ...prev, vatDocument: file }));
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {documents.vatDocument && (
            <p className="mt-2 text-sm text-green-600">✓ {documents.vatDocument.name} selected</p>
          )}
        </div>

        {/* Company Registration Document */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Registration Document <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Upload your official company registration certificate (CIPC). We will verify:
          </p>
          <ul className="text-xs text-gray-500 list-disc list-inside mb-3">
            <li>Registration number: {company.registrationNumber}</li>
            <li>Company name: {company.legalName}</li>
            <li>Registered address matches: {company.streetAddress}, {company.city}, {company.provinceState}</li>
          </ul>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setDocuments((prev) => ({ ...prev, companyRegDocument: file }));
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {documents.companyRegDocument && (
            <p className="mt-2 text-sm text-green-600">✓ {documents.companyRegDocument.name} selected</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Document Requirements</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Accepted formats: PDF, JPG, PNG</li>
            <li>• Maximum file size: 10MB per document</li>
            <li>• Documents must be clear and readable</li>
            <li>• Information must match the company details you provided</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('company')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('profile')}
          disabled={!isDocumentsValid()}
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
            value={user.firstName || ''}
            onChange={(e) => handleUserChange('firstName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={user.lastName || ''}
            onChange={(e) => handleUserChange('lastName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Job Title</label>
          <input
            type="text"
            value={user.jobTitle || ''}
            onChange={(e) => handleUserChange('jobTitle', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Project Manager"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Direct Phone</label>
          <input
            type="tel"
            value={user.directPhone || ''}
            onChange={(e) => handleUserChange('directPhone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 12 345 6789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
          <input
            type="tel"
            value={user.mobilePhone || ''}
            onChange={(e) => handleUserChange('mobilePhone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 82 123 4567"
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('company')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('security')}
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

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Important Security Notice</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Your account will be bound to this device. You will only be able to access your account from this device.
              If you need to change devices, please contact support.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={user.email || ''}
            onChange={(e) => handleUserChange('email', e.target.value)}
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
            value={user.password || ''}
            onChange={(e) => handleUserChange('password', e.target.value)}
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
            onChange={(e) => handleSecurityChange('confirmPassword', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {security.confirmPassword && user.password !== security.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">Passwords do not match</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Device Information</h4>
          {isFingerprintLoading ? (
            <p className="text-sm text-gray-500">Generating device fingerprint...</p>
          ) : fingerprint ? (
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">Device ID:</span>{' '}
                {fingerprint.substring(0, 16)}...
              </p>
              <p className="mt-1 text-xs text-gray-500">
                This device will be registered for secure access.
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-600">
              Unable to generate device fingerprint. Please refresh the page.
            </p>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Terms and Conditions</h4>
          <div className="text-xs text-gray-600 space-y-2">
            <p>By registering for an account, you agree to the following:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>You are authorized to represent the company specified in this registration.</li>
              <li>You will not share your login credentials with any other person.</li>
              <li>Your account is bound to a single device for security purposes.</li>
              <li>You will maintain the confidentiality of any pricing or technical information provided.</li>
              <li>You will use the portal only for legitimate business purposes.</li>
              <li>Annix reserves the right to suspend or terminate accounts for any violation of these terms.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="terms"
            checked={security.termsAccepted}
            onChange={(e) => handleSecurityChange('termsAccepted', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
            I have read and agree to the Terms and Conditions <span className="text-red-500">*</span>
          </label>
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="securityPolicy"
            checked={security.securityPolicyAccepted}
            onChange={(e) => handleSecurityChange('securityPolicyAccepted', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="securityPolicy" className="ml-2 text-sm text-gray-700">
            I understand and accept that my account will be locked to this device for security purposes <span className="text-red-500">*</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('profile')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isSecurityValid() || isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verify Your Email</h2>
      <p className="text-gray-600 mb-4">
        We&apos;ve sent a verification email to <strong>{user.email}</strong>.
      </p>
      <p className="text-gray-600 mb-8">
        Please check your inbox and click the verification link to activate your account.
        The link will expire in 24 hours.
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-700 text-left">
            Don&apos;t see the email? Check your spam folder or click below to resend.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => router.push('/customer/login')}
          className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Login
        </button>
        <p className="text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:support@annix.co.za" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customer Registration</h1>
          <p className="mt-2 text-gray-600">Create your Annix customer portal account</p>
        </div>

        {currentStep !== 'complete' && renderStepIndicator()}

        <div className="bg-white shadow rounded-lg p-8">
          {currentStep === 'company' && renderCompanyStep()}
          {currentStep === 'documents' && renderDocumentsStep()}
          {currentStep === 'profile' && renderProfileStep()}
          {currentStep === 'security' && renderSecurityStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>

        {currentStep !== 'complete' && (
          <p className="text-center mt-6 text-gray-600">
            Already have an account?{' '}
            <Link href="/customer/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
