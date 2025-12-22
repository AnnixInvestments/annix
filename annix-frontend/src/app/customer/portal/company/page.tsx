'use client';

import React, { useState, useEffect } from 'react';
import { customerPortalApi, CustomerCompanyDto } from '@/app/lib/api/customerApi';

export default function CustomerCompanyPage() {
  const [company, setCompany] = useState<CustomerCompanyDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [addressForm, setAddressForm] = useState({
    streetAddress: '',
    city: '',
    provinceState: '',
    postalCode: '',
    primaryPhone: '',
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const data = await customerPortalApi.getCompany();
      setCompany(data);
      setAddressForm({
        streetAddress: data.streetAddress || '',
        city: data.city || '',
        provinceState: data.provinceState || '',
        postalCode: data.postalCode || '',
        primaryPhone: data.primaryPhone || '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load company details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedCompany = await customerPortalApi.updateCompanyAddress(addressForm);
      setCompany(updatedCompany as any);
      setIsEditingAddress(false);
      setSuccessMessage('Address updated successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update address');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Information</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your company details. Contact support to update legal or registration information.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Company Details - Read Only */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Company Details</h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Legal Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{company?.legalName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Trading Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{company?.tradingName || 'Same as legal name'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{company?.registrationNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">VAT Number</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{company?.vatNumber || 'Not registered'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Industry</dt>
              <dd className="mt-1 text-sm text-gray-900">{company?.industry || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Company Size</dt>
              <dd className="mt-1 text-sm text-gray-900">{company?.companySize || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">General Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{company?.generalEmail || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Website</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {company?.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {company.website}
                  </a>
                ) : (
                  'Not set'
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Address - Editable */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Address & Contact</h2>
          {!isEditingAddress && (
            <button
              onClick={() => setIsEditingAddress(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>
        <div className="p-6">
          {isEditingAddress ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Street Address</label>
                  <input
                    type="text"
                    value={addressForm.streetAddress}
                    onChange={(e) => setAddressForm({ ...addressForm, streetAddress: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Province/State</label>
                  <input
                    type="text"
                    value={addressForm.provinceState}
                    onChange={(e) => setAddressForm({ ...addressForm, provinceState: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
                  <input
                    type="tel"
                    value={addressForm.primaryPhone}
                    onChange={(e) => setAddressForm({ ...addressForm, primaryPhone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <input
                    type="text"
                    value={company?.country || ''}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Contact support to change country</p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsEditingAddress(false);
                    setAddressForm({
                      streetAddress: company?.streetAddress || '',
                      city: company?.city || '',
                      provinceState: company?.provinceState || '',
                      postalCode: company?.postalCode || '',
                      primaryPhone: company?.primaryPhone || '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Street Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.streetAddress}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">City</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.city}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Province/State</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.provinceState}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Postal Code</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.postalCode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Country</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.country}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Primary Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.primaryPhone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fax Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.faxNumber || 'Not set'}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Need to update company details?</h4>
            <p className="mt-1 text-sm text-blue-700">
              To update legal company information, registration numbers, or country, please contact our support team at{' '}
              <a href="mailto:support@annix.co.za" className="underline">support@annix.co.za</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
