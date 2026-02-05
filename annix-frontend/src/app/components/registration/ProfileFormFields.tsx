'use client';

import React from 'react';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  directPhone?: string;
  mobilePhone?: string;
}

interface ProfileFormFieldsProps<T extends ProfileData> {
  profile: T;
  onChange: <K extends keyof T>(field: K, value: string) => void;
  jobTitlePlaceholder?: string;
}

export function ProfileFormFields<T extends ProfileData>({
  profile,
  onChange,
  jobTitlePlaceholder = 'e.g., Project Manager',
}: ProfileFormFieldsProps<T>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          First Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={profile.firstName || ''}
          onChange={(e) => onChange('firstName' as keyof T, e.target.value)}
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
          onChange={(e) => onChange('lastName' as keyof T, e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Job Title</label>
        <input
          type="text"
          value={profile.jobTitle || ''}
          onChange={(e) => onChange('jobTitle' as keyof T, e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder={jobTitlePlaceholder}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Direct Phone</label>
        <input
          type="tel"
          value={profile.directPhone || ''}
          onChange={(e) => onChange('directPhone' as keyof T, e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="+27 12 345 6789"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
        <input
          type="tel"
          value={profile.mobilePhone || ''}
          onChange={(e) => onChange('mobilePhone' as keyof T, e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="+27 82 123 4567"
        />
      </div>
    </div>
  );
}
