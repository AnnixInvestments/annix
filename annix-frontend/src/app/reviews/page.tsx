'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config';

interface ReviewWorkflow {
  id: number;
  entityType: 'drawing' | 'boq';
  entityId: number;
  workflowType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  fromStatus: string;
  toStatus: string;
  assignedReviewerId?: number;
  assignedReviewer?: {
    id: number;
    username: string;
  };
  initiatedBy: {
    id: number;
    username: string;
  };
  completedBy?: {
    id: number;
    username: string;
  };
  comments?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Populated entity details
  drawing?: {
    id: number;
    drawingNumber: string;
    title: string;
    status: string;
  };
  boq?: {
    id: number;
    boqNumber: string;
    title: string;
    status: string;
  };
}

interface PaginatedResult {
  data: ReviewWorkflow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ReviewDashboardPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    fetchReviews();
  }, [activeTab, entityFilter]);

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (entityFilter !== 'all') {
        params.set('entityType', entityFilter);
      }

      const endpoint = activeTab === 'pending' ? '/workflow/pending' : '/workflow/history';
      const response = await fetch(`${browserBaseUrl()}${endpoint}?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data: PaginatedResult = await response.json();
      setReviews(data.data);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    entityType: string,
    entityId: number,
    action: 'approve' | 'reject' | 'request-changes',
    comments?: string
  ) => {
    try {
      const endpoint =
        entityType === 'drawing'
          ? `/drawings/${entityId}/${action}`
          : `/boq/${entityId}/${action}`;

      const response = await fetch(`${browserBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ comments }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${action}`);
      }

      // Refresh the list
      fetchReviews(pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'changes_requested':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEntityInfo = (review: ReviewWorkflow) => {
    if (review.entityType === 'drawing' && review.drawing) {
      return {
        type: 'Drawing',
        number: review.drawing.drawingNumber,
        title: review.drawing.title,
        status: review.drawing.status,
        link: `/drawings/${review.entityId}`,
      };
    }
    if (review.entityType === 'boq' && review.boq) {
      return {
        type: 'BOQ',
        number: review.boq.boqNumber,
        title: review.boq.title,
        status: review.boq.status,
        link: `/boq/${review.entityId}`,
      };
    }
    return {
      type: review.entityType.toUpperCase(),
      number: `#${review.entityId}`,
      title: 'Unknown',
      status: 'unknown',
      link: `/${review.entityType}s/${review.entityId}`,
    };
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Review Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage pending reviews and view review history</p>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pending Reviews
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Review History
              </button>
            </div>

            {/* Filter */}
            <div>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Types</option>
                <option value="drawing">Drawings</option>
                <option value="boq">BOQs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats for pending tab */}
        {activeTab === 'pending' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📐</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Drawings</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reviews.filter((r) => r.entityType === 'drawing').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">BOQs</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {reviews.filter((r) => r.entityType === 'boq').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-4xl">
                {activeTab === 'pending' ? '✓' : '📜'}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'pending' ? 'No Pending Reviews' : 'No Review History'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'pending'
                ? "You're all caught up! There are no items waiting for review."
                : 'No reviews have been completed yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {reviews.map((review) => {
                const entityInfo = getEntityInfo(review);
                return (
                  <div
                    key={review.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Entity Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                entityInfo.type === 'Drawing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {entityInfo.type}
                            </span>
                            <span className="font-bold text-gray-900">{entityInfo.number}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getEntityStatusColor(
                                entityInfo.status
                              )}`}
                            >
                              {entityInfo.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-700 font-medium">{entityInfo.title}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>
                              Initiated by:{' '}
                              <span className="font-medium">{review.initiatedBy.username}</span>
                            </span>
                            <span>{formatDate(review.createdAt)}</span>
                          </div>
                          {review.comments && (
                            <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {review.comments}
                            </p>
                          )}
                        </div>

                        {/* Actions / Status */}
                        <div className="flex items-center gap-3">
                          {activeTab === 'pending' ? (
                            <>
                              <button
                                onClick={() =>
                                  handleAction(review.entityType, review.entityId, 'approve')
                                }
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const comments = prompt('Enter reason for changes:');
                                  if (comments) {
                                    handleAction(
                                      review.entityType,
                                      review.entityId,
                                      'request-changes',
                                      comments
                                    );
                                  }
                                }}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold transition-colors"
                              >
                                Request Changes
                              </button>
                              <button
                                onClick={() => {
                                  const comments = prompt('Enter reason for rejection:');
                                  if (comments) {
                                    handleAction(
                                      review.entityType,
                                      review.entityId,
                                      'reject',
                                      comments
                                    );
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <div className="text-right">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                                  review.status
                                )}`}
                              >
                                {review.status.replace('_', ' ').toUpperCase()}
                              </span>
                              {review.completedBy && (
                                <p className="text-sm text-gray-500 mt-1">
                                  by {review.completedBy.username}
                                </p>
                              )}
                              {review.completedAt && (
                                <p className="text-xs text-gray-400">
                                  {formatDate(review.completedAt)}
                                </p>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => router.push(entityInfo.link)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => fetchReviews(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchReviews(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
