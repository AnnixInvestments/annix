'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/app/lib/api/client';

interface RfqDetail {
  id: number;
  rfqNumber: string;
  projectName: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  status: string;
  notes?: string;
  totalWeightKg?: number;
  totalCost?: number;
  createdAt: string;
  updatedAt: string;
  items: any[];
}

export default function CustomerRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchRfq(Number(params.id));
    }
  }, [params.id]);

  const fetchRfq = async (id: number) => {
    try {
      const data = await apiClient.getRfqById(id);
      setRfq(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load RFQ');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'quoted':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error || 'RFQ not found'}</p>
        </div>
        <Link
          href="/customer/portal/rfqs"
          className="text-blue-600 hover:underline"
        >
          Back to RFQ list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/customer/portal/rfqs"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{rfq.rfqNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(rfq.status)}`}>
              {rfq.status}
            </span>
          </div>
          <p className="mt-1 text-lg text-gray-600">{rfq.projectName}</p>
        </div>
      </div>

      {/* RFQ Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {rfq.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700">{rfq.description}</p>
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {rfq.items && rfq.items.length > 0 ? (
                rfq.items.map((item, index) => (
                  <div key={item.id || index} className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {item.itemDescription || `Item ${index + 1}`}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.itemType === 'straight_pipe' && 'Straight Pipe'}
                          {item.itemType === 'bend' && 'Bend'}
                          {item.itemType === 'fitting' && 'Fitting'}
                        </p>
                      </div>
                      {item.quantity && (
                        <span className="text-sm text-gray-500">
                          Qty: {item.quantity}
                        </span>
                      )}
                    </div>
                    {item.itemNotes && (
                      <p className="text-sm text-gray-600 mt-2">{item.itemNotes}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No items in this RFQ
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {rfq.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700">{rfq.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(rfq.status)}`}>
                    {rfq.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(rfq.createdAt).toLocaleDateString()}
                </dd>
              </div>
              {rfq.requiredDate && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Required By</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(rfq.requiredDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {rfq.totalWeightKg && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Total Weight</dt>
                  <dd className="text-sm text-gray-900">
                    {rfq.totalWeightKg.toFixed(2)} kg
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">RFQ Status</h4>
                <p className="mt-1 text-sm text-blue-700">
                  {rfq.status === 'pending' && 'Your RFQ is being reviewed by our team. We will provide a quotation shortly.'}
                  {rfq.status === 'quoted' && 'A quotation has been provided. Please review and respond.'}
                  {rfq.status === 'accepted' && 'Thank you for accepting the quotation. We will be in touch shortly.'}
                  {rfq.status === 'draft' && 'This RFQ is in draft status and has not been submitted yet.'}
                  {rfq.status === 'rejected' && 'This quotation was declined.'}
                  {rfq.status === 'cancelled' && 'This RFQ has been cancelled.'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print RFQ
              </button>
              <a
                href={`mailto:support@annix.co.za?subject=Question about RFQ ${rfq.rfqNumber}`}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
