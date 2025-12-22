'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminCustomerApi,
  CustomerDetailResponse,
  CustomerLoginHistoryItem,
} from '@/app/lib/api/adminCustomerApi';

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [loginHistory, setLoginHistory] = useState<CustomerLoginHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showResetDeviceModal, setShowResetDeviceModal] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
      fetchLoginHistory();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const data = await adminCustomerApi.getCustomerDetail(customerId);
      setCustomer(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customer');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      const data = await adminCustomerApi.getLoginHistory(customerId, 20);
      setLoginHistory(data);
    } catch {
      // Silent fail - login history is not critical
    }
  };

  const handleSuspend = async () => {
    if (!actionReason.trim()) {
      setError('Please provide a reason for suspension');
      return;
    }

    setIsPerformingAction(true);
    setError(null);

    try {
      await adminCustomerApi.suspendCustomer(customerId, actionReason);
      setSuccessMessage('Customer account suspended successfully');
      setShowSuspendModal(false);
      setActionReason('');
      await fetchCustomer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to suspend customer');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleReactivate = async () => {
    setIsPerformingAction(true);
    setError(null);

    try {
      await adminCustomerApi.reactivateCustomer(customerId, actionReason || undefined);
      setSuccessMessage('Customer account reactivated successfully');
      setShowReactivateModal(false);
      setActionReason('');
      await fetchCustomer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reactivate customer');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleResetDevice = async () => {
    if (!actionReason.trim()) {
      setError('Please provide a reason for device reset');
      return;
    }

    setIsPerformingAction(true);
    setError(null);

    try {
      await adminCustomerApi.resetDeviceBinding(customerId, actionReason);
      setSuccessMessage('Device binding reset successfully. Customer will need to register new device on next login.');
      setShowResetDeviceModal(false);
      setActionReason('');
      await fetchCustomer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset device binding');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'deactivated':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error || 'Customer not found'}</p>
        </div>
        <Link href="/admin/customers" className="text-blue-600 hover:underline">
          Back to customer list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/customers" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.firstName} {customer.lastName}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(customer.accountStatus)}`}>
              {customer.accountStatus}
            </span>
          </div>
          <p className="mt-1 text-gray-600">{customer.email}</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">First Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.firstName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.jobTitle || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Direct Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.directPhone || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Mobile Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.mobilePhone || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Registered</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(customer.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Terms Accepted</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.termsAcceptedAt
                      ? new Date(customer.termsAcceptedAt).toLocaleString()
                      : 'Not accepted'}
                  </dd>
                </div>
              </dl>

              {customer.accountStatus === 'suspended' && customer.suspensionReason && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800">Suspension Information</h4>
                  <p className="mt-1 text-sm text-red-700">
                    <strong>Reason:</strong> {customer.suspensionReason}
                  </p>
                  {customer.suspendedAt && (
                    <p className="text-sm text-red-700">
                      <strong>Suspended At:</strong> {new Date(customer.suspendedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Legal Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company.legalName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Trading Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company.tradingName || 'Same as legal'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{customer.company.registrationNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">VAT Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{customer.company.vatNumber || 'Not registered'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Industry</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company.industry || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Size</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company.companySize || 'Not specified'}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.company.streetAddress}<br />
                    {customer.company.city}, {customer.company.provinceState} {customer.company.postalCode}<br />
                    {customer.company.country}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Primary Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company.primaryPhone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">General Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company.generalEmail || 'Not set'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Login History */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Login Attempts</h2>
            </div>
            <div className="overflow-x-auto">
              {loginHistory.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No login history available</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loginHistory.map((login) => (
                      <tr key={login.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(login.attemptTime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {login.success ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {login.ipAddress}
                          {login.ipMismatchWarning && (
                            <span className="ml-2 text-yellow-600" title="IP mismatch">
                              ⚠️
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {login.failureReason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Device Binding */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Device Binding</h2>
            </div>
            <div className="p-6">
              {customer.deviceBinding ? (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.deviceBinding.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {customer.deviceBinding.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Registered IP</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{customer.deviceBinding.registeredIp}</dd>
                  </div>
                  {customer.deviceBinding.ipCountry && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Country</dt>
                      <dd className="mt-1 text-sm text-gray-900">{customer.deviceBinding.ipCountry}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Registered At</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(customer.deviceBinding.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Device Fingerprint</dt>
                    <dd className="mt-1 text-xs text-gray-500 font-mono break-all">
                      {customer.deviceBinding.deviceFingerprint}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-gray-500">No device bound to this account</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              {customer.accountStatus === 'active' && (
                <button
                  onClick={() => setShowSuspendModal(true)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Suspend Account
                </button>
              )}

              {customer.accountStatus === 'suspended' && (
                <button
                  onClick={() => setShowReactivateModal(true)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Reactivate Account
                </button>
              )}

              {customer.deviceBinding?.isActive && (
                <button
                  onClick={() => setShowResetDeviceModal(true)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Device Binding
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Suspend Customer Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will suspend the customer's account and invalidate all active sessions.
              The customer will not be able to log in until reactivated.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for suspension <span className="text-red-500">*</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter reason for suspension..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setActionReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={isPerformingAction || !actionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {isPerformingAction ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reactivate Customer Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will reactivate the customer's account and allow them to log in again.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (optional)
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter any notes..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReactivateModal(false);
                  setActionReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={isPerformingAction}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {isPerformingAction ? 'Reactivating...' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Device Modal */}
      {showResetDeviceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Device Binding</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will reset the customer's device binding and invalidate all active sessions.
              The customer will need to register a new device on their next login.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for reset <span className="text-red-500">*</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter reason for device reset..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResetDeviceModal(false);
                  setActionReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDevice}
                disabled={isPerformingAction || !actionReason.trim()}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
              >
                {isPerformingAction ? 'Resetting...' : 'Reset Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
