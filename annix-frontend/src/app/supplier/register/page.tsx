'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDeviceFingerprint } from '@/app/hooks/useDeviceFingerprint';
import { supplierAuthApi, SupplierCompanyDto, SupplierProfileDto } from '@/app/lib/api/supplierApi';
import { CurrencySelect, DEFAULT_CURRENCY } from '@/app/components/ui/CurrencySelect';
import { currencyCodeForCountry } from '@/app/lib/currencies';
import { log } from '@/app/lib/logger';
import NixRegistrationVerifier, {
  VerificationResult,
  AutoCorrection,
  RegistrationDocumentType,
} from '@/app/lib/nix/components/NixRegistrationVerifier';
import { nixApi } from '@/app/lib/nix/api';
import {
  RegistrationTopToolbar,
  RegistrationBottomToolbar,
  StepConfig,
} from '@/app/components/RegistrationToolbar';
import {
  COMPANY_SIZE_OPTIONS,
  SOUTH_AFRICAN_PROVINCES,
  SUPPLIER_INDUSTRY_OPTIONS,
  BEE_LEVELS,
} from '@/app/lib/config/registration/constants';
import { validatePassword } from '@/app/lib/utils/passwordValidation';
import {
  PasswordInput,
  ConfirmPasswordInput,
  DeviceInfoDisplay,
  SecurityNotice,
  DocumentStorageNotice,
  TermsAndConditions,
  AcceptanceCheckbox,
  ErrorDisplay,
  InfoBanner,
} from '@/app/components/registration';

type Step = 'company' | 'bee' | 'documents' | 'profile' | 'security' | 'complete';

const REGISTRATION_STEPS: StepConfig[] = [
  { id: 'company', label: 'Company' },
  { id: 'bee', label: 'BEE' },
  { id: 'documents', label: 'Documents' },
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
];

const INDUSTRY_OPTIONS = SUPPLIER_INDUSTRY_OPTIONS;

export default function SupplierRegistrationPage() {
  const router = useRouter();
  const { fingerprint, browserInfo, isLoading: isFingerprintLoading } = useDeviceFingerprint();

  const [currentStep, setCurrentStep] = useState<Step>('company');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company data
  const [company, setCompany] = useState<Partial<SupplierCompanyDto>>({
    country: 'South Africa',
    currencyCode: DEFAULT_CURRENCY,
  });

  // User profile data
  const [profile, setProfile] = useState<Partial<SupplierProfileDto>>({});

  // Security/form data
  const [security, setSecurity] = useState<{
    email: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
    securityPolicyAccepted: boolean;
    documentStorageAccepted: boolean;
  }>({
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    securityPolicyAccepted: false,
    documentStorageAccepted: false,
  });

  // Document upload state
  const [documents, setDocuments] = useState<{
    vatDocument: File | null;
    companyRegDocument: File | null;
    beeDocument: File | null;
  }>({
    vatDocument: null,
    companyRegDocument: null,
    beeDocument: null,
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const [nixVerification, setNixVerification] = useState<{
    isVisible: boolean;
    isProcessing: boolean;
    currentDocumentType: RegistrationDocumentType;
    result: VerificationResult | null;
  }>({
    isVisible: false,
    isProcessing: false,
    currentDocumentType: 'vat',
    result: null,
  });

  const [documentsValidated, setDocumentsValidated] = useState<{
    vat: boolean;
    registration: boolean;
    bee: boolean;
  }>({
    vat: false,
    registration: false,
    bee: false,
  });

  const [pendingManualReview, setPendingManualReview] = useState<{
    vat: boolean;
    registration: boolean;
    bee: boolean;
  }>({
    vat: false,
    registration: false,
    bee: false,
  });

  const [storedVerificationResults, setStoredVerificationResults] = useState<{
    vat?: VerificationResult;
    registration?: VerificationResult;
    bee?: VerificationResult;
  }>({});

  useEffect(() => {
    if (security.password) {
      setPasswordErrors(validatePassword(security.password));
    } else {
      setPasswordErrors([]);
    }
  }, [security.password]);

  const handleCompanyChange = (field: keyof SupplierCompanyDto, value: any) => {
    setCompany((prev) => {
      const updates: Partial<SupplierCompanyDto> = { [field]: value };
      if (field === 'country') {
        const suggestedCurrency = currencyCodeForCountry(value);
        if (suggestedCurrency) {
          updates.currencyCode = suggestedCurrency;
        }
      }
      return { ...prev, ...updates };
    });
  };

  const handleProfileChange = (field: keyof SupplierProfileDto, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field: string, value: string | boolean) => {
    setSecurity((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (file: File | null, documentType: 'vat' | 'registration' | 'bee') => {
    const key = documentType === 'vat' ? 'vatDocument' : documentType === 'registration' ? 'companyRegDocument' : 'beeDocument';
    setDocuments((prev) => ({ ...prev, [key]: file }));

    if (!file) return;

    if (documentType === 'vat') {
      setPendingManualReview(prev => ({ ...prev, vat: true }));
      setDocumentsValidated(prev => ({ ...prev, vat: true }));
      return;
    }

    setNixVerification({
      isVisible: true,
      isProcessing: true,
      currentDocumentType: documentType,
      result: null,
    });

    try {
      let expectedData: any;

      if (documentType === 'registration') {
        expectedData = {
          registrationNumber: company.registrationNumber,
          companyName: company.legalName,
          streetAddress: company.streetAddress,
          city: company.city,
          provinceState: company.provinceState,
          postalCode: company.postalCode,
        };
      } else {
        expectedData = {
          companyName: company.legalName,
          beeLevel: company.beeLevel,
        };
      }

      const result = await nixApi.verifyRegistrationDocument(file, documentType, expectedData);

      log.debug('=== NIX VERIFICATION RESULT ===');
      log.debug('Document Type:', documentType);
      log.debug('Expected Data:', expectedData);
      log.debug('Result:', result);
      log.debug('===============================');

      setNixVerification(prev => ({
        ...prev,
        isProcessing: false,
        result,
      }));

      setStoredVerificationResults(prev => ({ ...prev, [documentType]: result }));

      if (result.allFieldsMatch) {
        setDocumentsValidated(prev => ({ ...prev, [documentType]: true }));
      }
    } catch (err) {
      log.error('Nix verification failed:', err);
      setNixVerification(prev => ({
        ...prev,
        isProcessing: false,
        result: {
          success: false,
          documentType,
          extractedData: { confidence: 0, fieldsExtracted: [] },
          fieldResults: [],
          overallConfidence: 0,
          allFieldsMatch: false,
          autoCorrections: [],
          warnings: [err instanceof Error ? err.message : 'Verification failed'],
          ocrMethod: 'none',
          processingTimeMs: 0,
        },
      }));
    }
  };

  const handleNixApplyCorrections = (corrections: AutoCorrection[]) => {
    corrections.forEach(({ field, value }) => {
      if (field in company || field === 'companyName') {
        const companyField = field === 'companyName' ? 'legalName' : field;
        if (companyField === 'beeLevel') {
          const levelMatch = String(value).match(/\d+/);
          if (levelMatch) {
            setCompany(prev => ({ ...prev, beeLevel: parseInt(levelMatch[0], 10) }));
          }
        } else {
          setCompany(prev => ({ ...prev, [companyField]: value }));
        }
      }
    });

    if (nixVerification.result) {
      setDocumentsValidated(prev => ({ ...prev, [nixVerification.currentDocumentType]: true }));
    }

    setNixVerification(prev => ({ ...prev, isVisible: false, result: null }));
  };

  const handleNixProceedWithMismatch = () => {
    setPendingManualReview(prev => ({ ...prev, [nixVerification.currentDocumentType]: true }));
    setDocumentsValidated(prev => ({ ...prev, [nixVerification.currentDocumentType]: true }));
    setNixVerification(prev => ({ ...prev, isVisible: false, result: null }));
  };

  const handleNixRetryUpload = () => {
    const docType = nixVerification.currentDocumentType;
    const key = docType === 'vat' ? 'vatDocument' : docType === 'registration' ? 'companyRegDocument' : 'beeDocument';
    setDocuments(prev => ({ ...prev, [key]: null }));
    setDocumentsValidated(prev => ({ ...prev, [docType]: false }));
    setStoredVerificationResults(prev => ({ ...prev, [docType]: undefined }));
    setNixVerification(prev => ({ ...prev, isVisible: false, result: null }));
  };

  const handleNixClose = () => {
    if (nixVerification.result?.allFieldsMatch) {
      setDocumentsValidated(prev => ({ ...prev, [nixVerification.currentDocumentType]: true }));
    }
    setNixVerification(prev => ({ ...prev, isVisible: false, result: null }));
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
      company.primaryContactName &&
      company.primaryContactEmail &&
      company.primaryContactPhone
    );
  };

  const isBeeValid = (): boolean => {
    // BEE is optional but if level is provided, need expiry
    if (company.beeLevel && !company.beeCertificateExpiry) return false;
    return true;
  };

  const isDocumentsValid = (): boolean => {
    // VAT and Company Reg are required, BEE is required if BEE level > 0
    if (!documents.vatDocument || !documents.companyRegDocument) return false;
    if (company.beeLevel && !documents.beeDocument && !company.isExemptMicroEnterprise) return false;
    return true;
  };

  const isProfileValid = (): boolean => {
    return !!(profile.firstName && profile.lastName);
  };

  const isSecurityValid = (): boolean => {
    return !!(
      security.email &&
      security.password &&
      security.password === security.confirmPassword &&
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
    if (step === 'company') return true;
    if (step === 'bee') return isCompanyValid();
    if (step === 'documents') return isCompanyValid() && isBeeValid();
    if (step === 'profile') return isCompanyValid() && isBeeValid() && isDocumentsValid();
    if (step === 'security') return isCompanyValid() && isBeeValid() && isDocumentsValid() && isProfileValid();
    return false;
  };

  const handleStepChange = (step: string) => {
    if (canNavigateToStep(step)) {
      setCurrentStep(step as Step);
    }
  };

  const handleSubmit = async () => {
    if (!fingerprint || !browserInfo) {
      setError('Device fingerprint not available. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      // Sanitize beeLevel to ensure it's a number
      let sanitizedBeeLevel: number | null = null;
      if (typeof company.beeLevel === 'number') {
        sanitizedBeeLevel = company.beeLevel;
      } else if (company.beeLevel) {
        const beeLevelStr = String(company.beeLevel);
        const match = beeLevelStr.match(/\d+/);
        if (match) {
          sanitizedBeeLevel = parseInt(match[0], 10);
        }
      }
      const sanitizedCompany = {
        ...company,
        beeLevel: sanitizedBeeLevel,
      };

      // Add company data
      formData.append('company', JSON.stringify(sanitizedCompany));

      // Add profile data
      formData.append('profile', JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
        jobTitle: profile.jobTitle,
        directPhone: profile.directPhone,
        mobilePhone: profile.mobilePhone,
      }));

      // Add security data
      formData.append('security', JSON.stringify({
        email: security.email,
        password: security.password,
        deviceFingerprint: fingerprint,
        browserInfo,
        termsAccepted: security.termsAccepted,
        securityPolicyAccepted: security.securityPolicyAccepted,
        documentStorageAccepted: security.documentStorageAccepted,
      }));

      // Add document verification results from Nix
      if (Object.keys(storedVerificationResults).length > 0) {
        formData.append('documentVerificationResults', JSON.stringify(storedVerificationResults));
      }

      // Add document files
      if (documents.vatDocument) {
        formData.append('vatDocument', documents.vatDocument);
      }
      if (documents.companyRegDocument) {
        formData.append('companyRegDocument', documents.companyRegDocument);
      }
      if (documents.beeDocument) {
        formData.append('beeDocument', documents.beeDocument);
      }

      // Call API with FormData - this will auto-login and store tokens
      await supplierAuthApi.registerFull(formData);

      // Redirect directly to dashboard (email verification disabled for development)
      router.push('/supplier/portal/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['company', 'bee', 'documents', 'profile', 'security'];
    const stepLabels = ['Company', 'BEE', 'Documents', 'Profile', 'Security'];

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
                  className={`w-12 h-1 ${
                    steps.indexOf(currentStep) > index
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center justify-center text-xs">
          {steps.map((step, index) => (
            <React.Fragment key={`label-${step}`}>
              <div
                className={`font-medium ${
                  currentStep === step ? 'text-blue-600' : 'text-gray-500'
                }`}
                style={{ width: index < steps.length - 1 ? '72px' : '40px', textAlign: 'center' }}
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
            value={company.industryType || ''}
            onChange={(e) => handleCompanyChange('industryType', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Company Size</label>
          <select
            value={company.companySize || ''}
            onChange={(e) => handleCompanyChange('companySize', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select size</option>
            {COMPANY_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
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
              <option key={province} value={province}>{province}</option>
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
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <input
            type="text"
            value={company.country || 'South Africa'}
            onChange={(e) => handleCompanyChange('country', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Preferred Currency</label>
          <CurrencySelect
            value={company.currencyCode || DEFAULT_CURRENCY}
            onChange={(value) => handleCompanyChange('currencyCode', value)}
            className="mt-1"
          />
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mt-8">Primary Contact</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Contact Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={company.primaryContactName || ''}
            onChange={(e) => handleCompanyChange('primaryContactName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Contact Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={company.primaryContactEmail || ''}
            onChange={(e) => handleCompanyChange('primaryContactEmail', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Contact Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={company.primaryContactPhone || ''}
            onChange={(e) => handleCompanyChange('primaryContactPhone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 12 345 6789"
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
          onClick={() => setCurrentStep('bee')}
          disabled={!isCompanyValid()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderBeeStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">B-BBEE Information</h2>
      <p className="text-sm text-gray-600">
        Broad-Based Black Economic Empowerment (B-BBEE) certification details. This information helps us match you with customers who have preferential procurement requirements.
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">EME Status</h3>
            <p className="mt-1 text-sm text-yellow-700">
              If your company has an annual turnover of R10 million or less, you may qualify as an Exempted Micro Enterprise (EME) and automatically receive Level 4 status.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="eme"
            checked={company.isExemptMicroEnterprise || false}
            onChange={(e) => handleCompanyChange('isExemptMicroEnterprise', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="eme" className="ml-2 text-sm text-gray-700">
            We are an Exempted Micro Enterprise (EME) - annual turnover R10 million or less
          </label>
        </div>

        {!company.isExemptMicroEnterprise && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">B-BBEE Level</label>
              <select
                value={company.beeLevel || ''}
                onChange={(e) => handleCompanyChange('beeLevel', e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select B-BBEE level</option>
                {BEE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {company.beeLevel && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    B-BBEE Certificate Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={company.beeCertificateExpiry || ''}
                    onChange={(e) => handleCompanyChange('beeCertificateExpiry', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Verification Agency</label>
                  <input
                    type="text"
                    value={company.beeVerificationAgency || ''}
                    onChange={(e) => handleCompanyChange('beeVerificationAgency', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Name of SANAS accredited verification agency"
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('company')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('documents')}
          disabled={!isBeeValid()}
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
        Please upload the required documents. These will be reviewed by our admin team before your account is fully activated.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Limited Access Until Verified</h3>
            <p className="mt-1 text-sm text-blue-700">
              Your account will have limited access until all documents have been verified by our admin team. You will receive an email once your account is fully activated.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* VAT Registration Document */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            VAT Registration Certificate <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Upload your official VAT registration certificate. This document will be verified manually by our admin team.
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null, 'vat')}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {documents.vatDocument && (
            <div className="mt-2">
              <p className="text-sm text-green-600">Selected: {documents.vatDocument.name}</p>
              <p className="text-xs text-orange-600 mt-1">Pending manual verification by admin</p>
            </div>
          )}
        </div>

        {/* Company Registration Document */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Registration Certificate (CIPC) <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Upload your official company registration certificate from CIPC.
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null, 'registration')}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {documents.companyRegDocument && (
            <p className="mt-2 text-sm text-green-600">Selected: {documents.companyRegDocument.name}</p>
          )}
        </div>

        {/* B-BBEE Certificate */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            B-BBEE Certificate {company.beeLevel && !company.isExemptMicroEnterprise && <span className="text-red-500">*</span>}
          </label>
          <p className="text-xs text-gray-500 mb-3">
            {company.isExemptMicroEnterprise
              ? 'Optional for EME - Upload sworn affidavit if available.'
              : company.beeLevel
              ? 'Required - Upload your valid B-BBEE certificate.'
              : 'Optional - Upload if you have a B-BBEE certificate.'}
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null, 'bee')}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {documents.beeDocument && (
            <p className="mt-2 text-sm text-green-600">Selected: {documents.beeDocument.name}</p>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Document Requirements</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>Accepted formats: PDF, JPG, PNG</li>
            <li>Maximum file size: 10MB per document</li>
            <li>Documents must be clear and readable</li>
            <li>Documents must be valid and not expired</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('bee')}
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
      <p className="text-sm text-gray-600">Personal information for the account holder.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={profile.firstName || ''}
            onChange={(e) => handleProfileChange('firstName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={profile.lastName || ''}
            onChange={(e) => handleProfileChange('lastName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Job Title</label>
          <input
            type="text"
            value={profile.jobTitle || ''}
            onChange={(e) => handleProfileChange('jobTitle', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Sales Manager"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Direct Phone</label>
          <input
            type="tel"
            value={profile.directPhone || ''}
            onChange={(e) => handleProfileChange('directPhone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 12 345 6789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
          <input
            type="tel"
            value={profile.mobilePhone || ''}
            onChange={(e) => handleProfileChange('mobilePhone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+27 82 123 4567"
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('documents')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('security')}
          disabled={!isProfileValid()}
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
            value={security.email}
            onChange={(e) => handleSecurityChange('email', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="your.email@company.co.za"
          />
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={security.password}
          onChange={(value) => handleSecurityChange('password', value)}
          required
          showToggle
          errors={passwordErrors}
          showSuccessMessage
        />

        <ConfirmPasswordInput
          id="confirmPassword"
          label="Confirm Password"
          value={security.confirmPassword}
          password={security.password}
          onChange={(value) => handleSecurityChange('confirmPassword', value)}
          required
          showToggle
        />

        <DeviceInfoDisplay fingerprint={fingerprint} isLoading={isFingerprintLoading} />

        <TermsAndConditions />

        <AcceptanceCheckbox
          id="terms"
          checked={security.termsAccepted}
          onChange={(checked) => handleSecurityChange('termsAccepted', checked)}
          label="I have read and agree to the Terms and Conditions"
          required
        />

        <AcceptanceCheckbox
          id="securityPolicy"
          checked={security.securityPolicyAccepted}
          onChange={(checked) => handleSecurityChange('securityPolicyAccepted', checked)}
          label="I understand and accept that my account will be locked to this device for security purposes"
          required
        />

        <DocumentStorageNotice />

        <AcceptanceCheckbox
          id="documentStorage"
          checked={security.documentStorageAccepted}
          onChange={(checked) => handleSecurityChange('documentStorageAccepted', checked)}
          label="I agree to the secure storage of my documents as described above"
          required
        />
      </div>

      <ErrorDisplay error={error} />

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
        We&apos;ve sent a verification email to <strong>{security.email}</strong>.
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
            <strong>Pending Verification:</strong> Your documents will be reviewed by our admin team. You will have limited access until your account is fully verified.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => router.push('/supplier/login')}
          className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Login
        </button>
        <p className="text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:info@annix.co.za" className="text-blue-600 hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );

  return (
    <>
      <RegistrationTopToolbar title="Supplier Registration" homeHref="/" />

      <div className="min-h-screen pt-20 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Supplier Registration</h1>
            <p className="mt-2 text-blue-200">Create your supplier account to start onboarding</p>
          </div>

          <div className="bg-white shadow rounded-lg p-8">
            {currentStep === 'company' && renderCompanyStep()}
            {currentStep === 'bee' && renderBeeStep()}
            {currentStep === 'documents' && renderDocumentsStep()}
            {currentStep === 'profile' && renderProfileStep()}
            {currentStep === 'security' && renderSecurityStep()}
            {currentStep === 'complete' && renderCompleteStep()}
          </div>

          {currentStep !== 'complete' && (
            <p className="text-center mt-6 text-blue-200">
              Already have an account?{' '}
              <Link href="/supplier/login" className="text-white hover:underline font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {/* Nix AI Registration Document Verifier */}
        <NixRegistrationVerifier
          isVisible={nixVerification.isVisible}
          isProcessing={nixVerification.isProcessing}
          verificationResult={nixVerification.result}
          documentType={nixVerification.currentDocumentType}
          onApplyCorrections={handleNixApplyCorrections}
          onProceedWithMismatch={handleNixProceedWithMismatch}
          onRetryUpload={handleNixRetryUpload}
          onClose={handleNixClose}
        />
      </div>

      <RegistrationBottomToolbar
        steps={REGISTRATION_STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        canNavigateToStep={canNavigateToStep}
      />
    </>
  );
}
