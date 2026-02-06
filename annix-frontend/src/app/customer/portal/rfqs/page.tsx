'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, draftsApi, RfqResponse, RfqDraftResponse, RfqDraftStatus } from '@/app/lib/api/client';
import { useToast } from '@/app/components/Toast';
import { formatDateZA, formatDateTimeZA } from '@/app/lib/datetime';
import { log } from '@/app/lib/logger';

export default function CustomerRfqsPage() {
  const { showToast } = useToast();
  const [rfqs, setRfqs] = useState<RfqResponse[]>([]);
  const [allRfqs, setAllRfqs] = useState<RfqDraftResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllRfqsLoading, setIsAllRfqsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'rfqs' | 'rfq-list'>('rfq-list');

  useEffect(() => {
    fetchRfqs();
    fetchAllRfqs();
  }, []);

  const fetchRfqs = async () => {
    try {
      const data = await apiClient.getRfqs();
      setRfqs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load RFQs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllRfqs = async () => {
    try {
      const data = await draftsApi.getAll();
      setAllRfqs(data);
    } catch (e) {
      log.error('Failed to load RFQs:', e);
    } finally {
      setIsAllRfqsLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId: number) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      await draftsApi.delete(draftId);
      setAllRfqs(allRfqs.filter(d => d.id !== draftId));
      showToast('Draft deleted successfully', 'success');
    } catch (e) {
      showToast('Failed to delete draft', 'error');
    }
  };

  const statusConfig: Record<RfqDraftStatus, { class: string; label: string }> = {
    draft: { class: 'bg-amber-100 text-amber-800', label: 'Draft' },
    submitted: { class: 'bg-blue-100 text-blue-800', label: 'Submitted' },
    pending: { class: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    in_review: { class: 'bg-purple-100 text-purple-800', label: 'In Review' },
    quoted: { class: 'bg-indigo-100 text-indigo-800', label: 'Quoted' },
    accepted: { class: 'bg-green-100 text-green-800', label: 'Accepted' },
    rejected: { class: 'bg-red-100 text-red-800', label: 'Rejected' },
    cancelled: { class: 'bg-gray-100 text-gray-600', label: 'Cancelled' },
  };

  const getStatusBadgeClass = (status: string) => {
    const config = statusConfig[status.toLowerCase() as RfqDraftStatus];
    return config?.class || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status.toLowerCase() as RfqDraftStatus];
    return config?.label || status;
  };

  const filteredRfqs = filter === 'all'
    ? rfqs
    : rfqs.filter(rfq => rfq.status.toLowerCase() === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My RFQs</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your requests for quotation
          </p>
        </div>
        <Link
          href="/customer/portal/rfqs/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New RFQ
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rfq-list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rfq-list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            RFQ List
            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
              {allRfqs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rfqs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rfqs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Submitted RFQs
            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-800">
              {rfqs.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Filters - only show for RFQs tab */}
      {activeTab === 'rfqs' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'draft', 'pending', 'quoted', 'accepted', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className="ml-1 text-xs">
                    ({rfqs.filter(r => status === 'all' || r.status.toLowerCase() === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RFQ List - only show when RFQs tab is active */}
      {activeTab === 'rfqs' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredRfqs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No RFQs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all'
                  ? "Get started by creating a new request for quotation."
                  : `No RFQs with status "${filter}" found.`}
              </p>
              {filter === 'all' && (
                <div className="mt-6">
                  <Link
                    href="/customer/portal/rfqs/create"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create RFQ
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RFQ Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{rfq.rfqNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{rfq.projectName}</span>
                      {rfq.description && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">{rfq.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(rfq.status)}`}>
                        {rfq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rfq.itemCount} item{rfq.itemCount !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateZA(rfq.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Link
                        href={`/customer/portal/rfqs/${rfq.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/customer/portal/rfqs/create?edit=${rfq.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* RFQ List - shows all RFQs (drafts, submitted, closed) */}
      {activeTab === 'rfq-list' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isAllRfqsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : allRfqs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No RFQs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first request for quotation.
              </p>
              <div className="mt-6">
                <Link
                  href="/customer/portal/rfqs/create"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create RFQ
                </Link>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RFQ Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Reference / Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${rfq.isConverted ? 'text-blue-700' : 'text-amber-700'}`}>
                        {rfq.rfqNumber || rfq.draftNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{rfq.customerRfqReference || '-'}</span>
                        {rfq.projectName && (
                          <p className="text-xs text-gray-500">{rfq.projectName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(rfq.status)}`}>
                        {getStatusLabel(rfq.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${rfq.isConverted ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${rfq.completionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{rfq.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTimeZA(rfq.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      {rfq.isConverted ? (
                        <>
                          <Link
                            href={`/customer/portal/rfqs/${rfq.convertedRfqId}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          <Link
                            href={`/customer/portal/rfqs/create?edit=${rfq.convertedRfqId}`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Edit
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/customer/portal/rfqs/create?draft=${rfq.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Continue
                          </Link>
                          <button
                            onClick={() => handleDeleteDraft(rfq.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
