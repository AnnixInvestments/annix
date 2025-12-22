'use client';

import { useState, useEffect } from 'react';
import { supplierPortalApi, SupplierProfileDto } from '@/app/lib/api/supplierApi';
import { useSupplierAuth } from '@/app/context/SupplierAuthContext';

interface ProfileData extends SupplierProfileDto {
  email?: string;
}

export default function SupplierProfilePage() {
  const { supplier, refreshDashboard } = useSupplierAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<SupplierProfileDto>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await supplierPortalApi.getProfile();
        setProfile(data);
        setEditData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          jobTitle: data.jobTitle || '',
          directPhone: data.directPhone || '',
          mobilePhone: data.mobilePhone || '',
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await supplierPortalApi.updateProfile(editData);
      setProfile(updated);
      setIsEditing(false);
      setSuccess('Profile updated successfully');
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
              {(profile?.firstName?.[0] || supplier?.email?.[0] || 'S').toUpperCase()}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.firstName && profile?.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : 'Your Profile'}
              </h1>
              <p className="text-gray-600">{profile?.email || supplier?.email}</p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit Profile
            </button>
          )}
        </div>
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

      {/* Profile Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            {isEditing ? (
              <input
                type="text"
                name="firstName"
                value={editData.firstName || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.firstName || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                name="lastName"
                value={editData.lastName || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.lastName || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Job Title</label>
            {isEditing ? (
              <input
                type="text"
                name="jobTitle"
                value={editData.jobTitle || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.jobTitle || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{profile?.email || supplier?.email}</p>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Direct Phone</label>
            {isEditing ? (
              <input
                type="tel"
                name="directPhone"
                value={editData.directPhone || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.directPhone || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
            {isEditing ? (
              <input
                type="tel"
                name="mobilePhone"
                value={editData.mobilePhone || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="mt-1 text-gray-900">{profile?.mobilePhone || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account Status</h2>
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-sm text-gray-500">Account Status</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              supplier?.accountStatus === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {supplier?.accountStatus?.toUpperCase() || 'PENDING'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Onboarding Status</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              supplier?.onboardingStatus === 'approved'
                ? 'bg-green-100 text-green-800'
                : supplier?.onboardingStatus === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {supplier?.onboardingStatus?.replace(/_/g, ' ').toUpperCase() || 'DRAFT'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsEditing(false)}
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
