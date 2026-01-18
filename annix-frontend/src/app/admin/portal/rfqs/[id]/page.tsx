'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApiClient } from '@/app/lib/api/adminApi';
import { formatDateZA } from '@/app/lib/datetime';
import { StatusBadge, LoadingSpinner, ErrorDisplay } from '@/app/admin/components';

interface RfqDetail {
  id: number;
  projectName: string;
  description?: string;
  requiredDate?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    email: string;
    name: string;
  };
}

interface RfqItem {
  id: number;
  type: string;
  quantity: number;
  weightPerUnit?: number;
  totalWeight?: number;
  unitPrice?: number;
  totalPrice?: number;
  specifications?: any;
}

export default function AdminRfqDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [items, setItems] = useState<RfqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRfqDetail = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const [detail, rfqItems] = await Promise.all([
        adminApiClient.getRfqDetail(parseInt(id)),
        adminApiClient.getRfqItems(parseInt(id)),
      ]);

      setRfq(detail);
      setItems(rfqItems);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch RFQ details');
      console.error('Error fetching RFQ:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRfqDetail();
  }, [fetchRfqDetail]);

  if (isLoading) {
    return <LoadingSpinner message="Loading RFQ details..." />;
  }

  if (error || !rfq) {
    return (
      <ErrorDisplay
        title="Error Loading RFQ"
        message={error || 'RFQ not found'}
        onRetry={() => router.push('/admin/portal/rfqs')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/portal/rfqs')}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to RFQs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{rfq.projectName}</h1>
          <p className="mt-1 text-sm text-gray-600">RFQ Draft Details (read-only)</p>
        </div>
        <StatusBadge status={rfq.status} />
      </div>

      {/* Customer Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Customer Name</p>
            <p className="text-gray-900 font-medium">{rfq.customerName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900 font-medium">{rfq.customerEmail || 'N/A'}</p>
          </div>
          {rfq.customerPhone && (
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900 font-medium">{rfq.customerPhone}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-gray-900 font-medium">{formatDateZA(rfq.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-gray-900 font-medium">{formatDateZA(rfq.updatedAt)}</p>
          </div>
          {rfq.requiredDate && (
            <div>
              <p className="text-sm text-gray-500">Required Date</p>
              <p className="text-gray-900 font-medium">{formatDateZA(rfq.requiredDate)}</p>
            </div>
          )}
        </div>
        {rfq.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Description</p>
            <p className="text-gray-900 mt-1">{rfq.description}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Items ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No items in this RFQ draft</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                    Item {index + 1}: {item.type}
                  </span>
                  <span className="text-gray-500 text-sm">Qty: {item.quantity}</span>
                </div>
                {item.specifications && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <p className="text-gray-500 text-xs mb-1">Specifications:</p>
                    <pre className="text-gray-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(item.specifications, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Created By */}
      {rfq.createdBy && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Created By</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-gray-900 font-medium">{rfq.createdBy.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900 font-medium">{rfq.createdBy.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
