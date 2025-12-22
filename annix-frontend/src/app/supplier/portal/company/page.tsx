'use client';

import { useState, useEffect } from 'react';
import { supplierPortalApi, SupplierCompanyDto } from '@/app/lib/api/supplierApi';

export default function SupplierCompanyPage() {
  const [company, setCompany] = useState<SupplierCompanyDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<SupplierCompanyDto | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const profile = await supplierPortalApi.getProfile();
        if (profile.company) {
          setCompany(profile.company);
        }
      } catch (err) {
        console.error('Failed to fetch company:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, []);

  const handleEdit = () => {
    setEditData(company);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData(null);
    setIsEditing(false);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async () => {
    if (!editData) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await supplierPortalApi.saveCompanyDetails(editData);
      setCompany(editData);
      setIsEditing(false);
      setSuccess('Company details updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company details');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company && !isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No company information</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please complete your onboarding to add company details.
        </p>
      </div>
    );
  }

  const displayData = isEditing ? editData : company;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Details</h1>
          <p className="mt-1 text-gray-600">View and manage your company information</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Edit Details
          </button>
        )}
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

      {/* Company Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Company Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField
            label="Legal Name"
            value={displayData?.legalName}
            name="legalName"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Trading Name"
            value={displayData?.tradingName}
            name="tradingName"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Registration Number"
            value={displayData?.registrationNumber}
            name="registrationNumber"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Tax Number"
            value={displayData?.taxNumber}
            name="taxNumber"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="VAT Number"
            value={displayData?.vatNumber}
            name="vatNumber"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Industry Type"
            value={displayData?.industryType}
            name="industryType"
            isEditing={isEditing}
            onChange={handleChange}
          />
        </dl>
      </div>

      {/* Address */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Business Address</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <InfoField
              label="Street Address"
              value={displayData?.streetAddress}
              name="streetAddress"
              isEditing={isEditing}
              onChange={handleChange}
            />
          </div>
          <div className="md:col-span-2">
            <InfoField
              label="Address Line 2"
              value={displayData?.addressLine2}
              name="addressLine2"
              isEditing={isEditing}
              onChange={handleChange}
            />
          </div>
          <InfoField
            label="City"
            value={displayData?.city}
            name="city"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Province/State"
            value={displayData?.provinceState}
            name="provinceState"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Postal Code"
            value={displayData?.postalCode}
            name="postalCode"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Country"
            value={displayData?.country}
            name="country"
            isEditing={isEditing}
            onChange={handleChange}
          />
        </dl>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Primary Contact</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField
            label="Contact Name"
            value={displayData?.primaryContactName}
            name="primaryContactName"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Contact Email"
            value={displayData?.primaryContactEmail}
            name="primaryContactEmail"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Contact Phone"
            value={displayData?.primaryContactPhone}
            name="primaryContactPhone"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Office Phone"
            value={displayData?.primaryPhone}
            name="primaryPhone"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="General Email"
            value={displayData?.generalEmail}
            name="generalEmail"
            isEditing={isEditing}
            onChange={handleChange}
          />
          <InfoField
            label="Website"
            value={displayData?.website}
            name="website"
            isEditing={isEditing}
            onChange={handleChange}
          />
        </dl>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoField({
  label,
  value,
  name,
  isEditing,
  onChange,
}: {
  label: string;
  value?: string;
  name: string;
  isEditing: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  if (isEditing) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        <input
          type="text"
          name={name}
          value={value || ''}
          onChange={onChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    );
  }

  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}
