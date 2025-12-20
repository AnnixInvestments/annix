'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config';

interface Drawing {
  id: number;
  drawingNumber: string;
  title: string;
  status: string;
  fileType: string;
  currentVersion: number;
  createdAt: string;
}

interface Boq {
  id: number;
  boqNumber: string;
  title: string;
  status: string;
  totalQuantity?: number;
  totalWeightKg?: number;
  totalEstimatedCost?: number;
  createdAt: string;
}

interface RfqItem {
  id: number;
  lineNumber: number;
  description: string;
  itemType: string;
  quantity: number;
  weightPerUnitKg?: number;
  totalWeightKg?: number;
  totalPrice?: number;
  notes?: string;
}

interface Rfq {
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
  items: RfqItem[];
  drawings: Drawing[];
  boqs: Boq[];
}

export default function RfqDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'drawings' | 'boqs'>('items');

  useEffect(() => {
    if (id) {
      fetchRfq();
    }
  }, [id]);

  const fetchRfq = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${browserBaseUrl()}/rfq/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RFQ');
      }

      const data = await response.json();
      setRfq(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'quoted':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'changes_requested':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading RFQ...</p>
        </div>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'RFQ not found'}</p>
          <button
            onClick={() => router.push('/rfq/list')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Back to RFQs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/rfq/list')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <span>←</span>
            <span>Back to RFQs</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {rfq.rfqNumber}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                    rfq.status
                  )}`}
                >
                  {rfq.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xl text-gray-700 font-medium">{rfq.projectName}</p>
              {rfq.description && <p className="text-gray-600 mt-1">{rfq.description}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/drawings/upload?rfqId=${rfq.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                + Add Drawing
              </button>
              <button
                onClick={() => router.push(`/boq/create?rfqId=${rfq.id}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                + Add BOQ
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Customer</p>
            <p className="text-lg font-semibold text-gray-900">
              {rfq.customerName || 'Not specified'}
            </p>
            {rfq.customerEmail && <p className="text-sm text-gray-500">{rfq.customerEmail}</p>}
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Total Weight (kg)</p>
            <p className="text-2xl font-bold text-blue-600">{formatNumber(rfq.totalWeightKg)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Estimated Cost</p>
            <p className="text-2xl font-bold text-green-600">
              {rfq.totalCost ? `R ${formatNumber(rfq.totalCost)}` : 'TBD'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500 mb-1">Required Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {rfq.requiredDate ? formatDate(rfq.requiredDate) : 'Not specified'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-4 p-4">
              <button
                onClick={() => setActiveTab('items')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'items'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Line Items ({rfq.items?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('drawings')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'drawings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Drawings ({rfq.drawings?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('boqs')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'boqs'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                BOQs ({rfq.boqs?.length || 0})
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Line Items Tab */}
            {activeTab === 'items' && (
              <div>
                {rfq.items?.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl text-gray-300 mb-4 block">📦</span>
                    <p className="text-gray-500">No line items yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Line #
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Description
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Type
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            Qty
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            Weight (kg)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfq.items.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-600">{item.lineNumber}</td>
                            <td className="py-3 px-4 text-gray-900">{item.description}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                {item.itemType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-900">{item.quantity}</td>
                            <td className="py-3 px-4 text-right text-gray-900">
                              {formatNumber(item.totalWeightKg)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Drawings Tab */}
            {activeTab === 'drawings' && (
              <div>
                {rfq.drawings?.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl text-gray-300 mb-4 block">📐</span>
                    <p className="text-gray-500 mb-4">No drawings linked to this RFQ</p>
                    <button
                      onClick={() => router.push(`/drawings/upload?rfqId=${rfq.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                    >
                      Upload Drawing
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {rfq.drawings.map((drawing) => (
                      <div
                        key={drawing.id}
                        onClick={() => router.push(`/drawings/${drawing.id}`)}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">{drawing.drawingNumber}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                                  drawing.status
                                )}`}
                              >
                                {drawing.status.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {drawing.fileType.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-700">{drawing.title}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Version {drawing.currentVersion} • Created {formatDate(drawing.createdAt)}
                            </p>
                          </div>
                          <span className="text-xl text-gray-400">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BOQs Tab */}
            {activeTab === 'boqs' && (
              <div>
                {rfq.boqs?.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl text-gray-300 mb-4 block">📊</span>
                    <p className="text-gray-500 mb-4">No BOQs linked to this RFQ</p>
                    <button
                      onClick={() => router.push(`/boq/create?rfqId=${rfq.id}`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
                    >
                      Create BOQ
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {rfq.boqs.map((boq) => (
                      <div
                        key={boq.id}
                        onClick={() => router.push(`/boq/${boq.id}`)}
                        className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">{boq.boqNumber}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                                  boq.status
                                )}`}
                              >
                                {boq.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-700">{boq.title}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Created {formatDate(boq.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="text-xs text-gray-400">Quantity</p>
                              <p className="font-medium text-blue-600">
                                {formatNumber(boq.totalQuantity)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400">Weight (kg)</p>
                              <p className="font-medium text-purple-600">
                                {formatNumber(boq.totalWeightKg)}
                              </p>
                            </div>
                            <span className="text-xl text-gray-400">→</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        {rfq.notes && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{rfq.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
