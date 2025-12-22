'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupplierAuth } from '@/app/context/SupplierAuthContext';
import { supplierPortalApi, OnboardingStatusResponse } from '@/app/lib/api/supplierApi';

export default function SupplierDashboardPage() {
  const { supplier, dashboard, refreshDashboard } = useSupplierAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await supplierPortalApi.getOnboardingStatus();
        setOnboardingStatus(status);
      } catch (err) {
        console.error('Failed to fetch onboarding status:', err);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchStatus();
    refreshDashboard();
  }, [refreshDashboard]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'submitted':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Your supplier account has been approved. You can now access all portal features.';
      case 'rejected':
        return 'Your application was not approved. Please review the feedback and resubmit.';
      case 'submitted':
        return 'Your application has been submitted and is awaiting review.';
      case 'under_review':
        return 'Your application is currently being reviewed by our team.';
      default:
        return 'Complete your onboarding to become an approved supplier.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {supplier?.firstName || supplier?.companyName || 'Supplier'}
        </h1>
        <p className="mt-1 text-gray-600">
          {dashboard?.profile.email}
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg border p-4 ${getStatusColor(onboardingStatus?.status || 'draft')}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {onboardingStatus?.status === 'approved' ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : onboardingStatus?.status === 'rejected' ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">
              Status: {(onboardingStatus?.status || 'draft').replace(/_/g, ' ').toUpperCase()}
            </h3>
            <p className="mt-1 text-sm">
              {getStatusMessage(onboardingStatus?.status || 'draft')}
            </p>
          </div>
        </div>
      </div>

      {/* Rejection Details */}
      {onboardingStatus?.status === 'rejected' && onboardingStatus.rejectionReason && (
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Reason for Rejection</h3>
          <p className="text-gray-600">{onboardingStatus.rejectionReason}</p>
          {onboardingStatus.remediationSteps && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Steps to Resolve:</h4>
              <p className="text-gray-600">{onboardingStatus.remediationSteps}</p>
            </div>
          )}
          <div className="mt-4">
            <Link
              href="/supplier/portal/onboarding"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Update Application
            </Link>
          </div>
        </div>
      )}

      {/* Onboarding Checklist */}
      {onboardingStatus?.status !== 'approved' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Onboarding Checklist</h2>
          <div className="space-y-3">
            <ChecklistItem
              label="Company Details"
              complete={onboardingStatus?.companyDetailsComplete || false}
              href="/supplier/portal/onboarding"
            />
            <ChecklistItem
              label="Required Documents"
              complete={onboardingStatus?.documentsComplete || false}
              href="/supplier/portal/documents"
              subtext={
                onboardingStatus?.missingDocuments?.length
                  ? `Missing: ${onboardingStatus.missingDocuments.join(', ')}`
                  : undefined
              }
            />
          </div>

          {onboardingStatus?.canSubmit && onboardingStatus.status === 'draft' && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">
                All requirements met! You can now submit your application for review.
              </p>
              <Link
                href="/supplier/portal/onboarding"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Submit Application
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Document Summary */}
      {dashboard?.documents && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Documents</h2>
            <Link
              href="/supplier/portal/documents"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total" value={dashboard.documents.total} />
            <StatCard label="Valid" value={dashboard.documents.valid} color="green" />
            <StatCard label="Pending" value={dashboard.documents.pending} color="yellow" />
            <StatCard label="Invalid" value={dashboard.documents.invalid} color="red" />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Company Details"
          description="Update your company information"
          href="/supplier/portal/company"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <QuickActionCard
          title="Upload Documents"
          description="Add or update your documents"
          href="/supplier/portal/documents"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          }
        />
        <QuickActionCard
          title="Your Profile"
          description="Manage your account settings"
          href="/supplier/portal/profile"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function ChecklistItem({
  label,
  complete,
  href,
  subtext,
}: {
  label: string;
  complete: boolean;
  href: string;
  subtext?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
            complete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
          }`}
        >
          {complete ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
            </svg>
          )}
        </div>
        <div>
          <span className={complete ? 'text-gray-900' : 'text-gray-600'}>{label}</span>
          {subtext && <p className="text-xs text-red-500 mt-0.5">{subtext}</p>}
        </div>
      </div>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function StatCard({
  label,
  value,
  color = 'blue',
}: {
  label: string;
  value: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-lg p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-75">{label}</p>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className="text-blue-600 mb-3">{icon}</div>
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  );
}
