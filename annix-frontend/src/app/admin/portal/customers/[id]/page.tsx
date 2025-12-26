'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApiClient, CustomerDetail, LoginHistoryItem, CustomerDocument } from '@/app/lib/api/adminApi';

type TabType = 'overview' | 'documents' | 'activity';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = parseInt(params?.id as string);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomerDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [customerData, loginHistoryData, documentsData] = await Promise.all([
        adminApiClient.getCustomerDetail(customerId),
        adminApiClient.getCustomerLoginHistory(customerId, 20),
        adminApiClient.getCustomerDocuments(customerId),
      ]);

      setCustomer(customerData);
      setLoginHistory(loginHistoryData);
      setDocuments(documentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customer details');
      console.error('Error fetching customer:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetail();
    }
  }, [customerId]);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApiClient.suspendCustomer(customerId, { reason: suspendReason });
      setSuspendDialogOpen(false);
      setSuspendReason('');
      fetchCustomerDetail(); // Refresh data
    } catch (err: any) {
      alert(`Failed to suspend customer: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Are you sure you want to reactivate this customer account?')) {
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApiClient.reactivateCustomer(customerId, { note: 'Account reactivated by admin' });
      fetchCustomerDetail(); // Refresh data
    } catch (err: any) {
      alert(`Failed to reactivate customer: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDevice = async () => {
    const reason = prompt('Please provide a reason for resetting device binding:');
    if (!reason) return;

    try {
      setIsSubmitting(true);
      await adminApiClient.resetDeviceBinding(customerId, { reason });
      fetchCustomerDetail(); // Refresh data
    } catch (err: any) {
      alert(`Failed to reset device binding: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'deactivated':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Customer</div>
          <p className="text-gray-600">{error || 'Customer not found'}</p>
          <button
            onClick={() => router.push('/admin/portal/customers')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/portal/customers')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-sm text-gray-600">{customer.email}</p>
          </div>
          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(customer.accountStatus)}`}>
            {customer.accountStatus}
          </span>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          {customer.accountStatus === 'active' && (
            <button
              onClick={() => setSuspendDialogOpen(true)}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Suspend Account
            </button>
          )}
          {customer.accountStatus === 'suspended' && (
            <button
              onClick={handleReactivate}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reactivate Account
            </button>
          )}
          {customer.deviceBound && (
            <button
              onClick={handleResetDevice}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Reset Device
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Activity
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.firstName} {customer.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.email}</dd>
              </div>
              {customer.jobTitle && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.jobTitle}</dd>
                </div>
              )}
              {customer.directPhone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Direct Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.directPhone}</dd>
                </div>
              )}
              {customer.mobilePhone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Mobile Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.mobilePhone}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Company Information */}
          {customer.company && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Company Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.company.name}</dd>
                </div>
                {customer.company.vatNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">VAT Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.company.vatNumber}</dd>
                  </div>
                )}
                {customer.company.registrationNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.company.registrationNumber}</dd>
                  </div>
                )}
                {customer.company.address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {customer.company.address}
                      {customer.company.city && `, ${customer.company.city}`}
                      {customer.company.province && `, ${customer.company.province}`}
                      {customer.company.postalCode && ` ${customer.company.postalCode}`}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Account Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Account Status</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(customer.accountStatus)}`}>
                    {customer.accountStatus}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Device Binding</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {customer.deviceBound ? (
                    <span className="text-green-600">Device Bound</span>
                  ) : (
                    <span className="text-gray-400">Not Bound</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Registration Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(customer.createdAt)}</dd>
              </div>
              {customer.lastLoginAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(customer.lastLoginAt)}</dd>
                </div>
              )}
              {customer.suspendedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Suspended At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(customer.suspendedAt)}</dd>
                </div>
              )}
              {customer.suspensionReason && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Suspension Reason</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.suspensionReason}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Onboarding Status */}
          {customer.onboarding && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Onboarding Status</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.onboarding.status}</dd>
                </div>
                {customer.onboarding.submittedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(customer.onboarding.submittedAt)}</dd>
                  </div>
                )}
                {customer.onboarding.reviewedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Reviewed At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(customer.onboarding.reviewedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
              <p className="mt-1 text-sm text-gray-500">This customer has not uploaded any documents yet.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.documentType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.fileName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(doc.uploadedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.validationStatus || 'Pending'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Login History</h3>
          </div>
          {loginHistory.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No login activity</h3>
              <p className="mt-1 text-sm text-gray-500">This customer has not logged in yet.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loginHistory.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(log.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ipAddress}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.userAgent}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.success ? (
                        <span className="text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Success
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {log.failureReason || 'Failed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Suspend Dialog */}
      {suspendDialogOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Suspend Customer Account</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for suspending this customer account. The customer will be notified.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter reason for suspension..."
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSuspendDialogOpen(false);
                  setSuspendReason('');
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
