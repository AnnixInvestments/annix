'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config';

interface BoqLineItem {
  id: number;
  lineNumber: number;
  itemCode?: string;
  description: string;
  itemType: string;
  unitOfMeasure: string;
  quantity: number;
  unitWeightKg?: number;
  totalWeightKg?: number;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
  drawingReference?: string;
}

interface Boq {
  id: number;
  boqNumber: string;
  title: string;
  description?: string;
  status: string;
  totalQuantity?: number;
  totalWeightKg?: number;
  totalEstimatedCost?: number;
  createdBy: {
    id: number;
    username: string;
  };
  drawing?: {
    id: number;
    drawingNumber: string;
  };
  rfq?: {
    id: number;
    rfqNumber: string;
  };
  lineItems: BoqLineItem[];
  createdAt: string;
  updatedAt: string;
}

const ITEM_TYPES = [
  { value: 'straight_pipe', label: 'Straight Pipe' },
  { value: 'bend', label: 'Bend' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'flange', label: 'Flange' },
  { value: 'valve', label: 'Valve' },
  { value: 'support', label: 'Support' },
  { value: 'coating', label: 'Coating' },
  { value: 'lining', label: 'Lining' },
  { value: 'custom', label: 'Custom' },
];

export default function BoqDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [boq, setBoq] = useState<Boq | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BoqLineItem | null>(null);

  useEffect(() => {
    if (id) {
      fetchBoq();
    }
  }, [id]);

  const fetchBoq = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${browserBaseUrl()}/boq/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch BOQ');
      }

      const data = await response.json();
      setBoq(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLineItem = async (item: Partial<BoqLineItem>) => {
    try {
      const response = await fetch(`${browserBaseUrl()}/boq/${id}/line-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add line item');
      }

      setShowAddModal(false);
      await fetchBoq();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add line item');
    }
  };

  const handleUpdateLineItem = async (itemId: number, updates: Partial<BoqLineItem>) => {
    try {
      const response = await fetch(`${browserBaseUrl()}/boq/${id}/line-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update line item');
      }

      setEditingItem(null);
      await fetchBoq();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update line item');
    }
  };

  const handleDeleteLineItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;

    try {
      const response = await fetch(`${browserBaseUrl()}/boq/${id}/line-items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete line item');
      }

      await fetchBoq();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete line item');
    }
  };

  const handleSubmitForReview = async () => {
    try {
      const response = await fetch(`${browserBaseUrl()}/workflow/boqs/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit for review');
      }

      await fetchBoq();
      alert('BOQ submitted for review');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  const getStatusColor = (status: string) => {
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

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
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
          <p className="text-gray-600 text-lg">Loading BOQ...</p>
        </div>
      </div>
    );
  }

  if (error || !boq) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'BOQ not found'}</p>
          <button
            onClick={() => router.push('/boq')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to BOQs
          </button>
        </div>
      </div>
    );
  }

  const canEdit = boq.status === 'draft' || boq.status === 'changes_requested';
  const canSubmit = canEdit && boq.lineItems.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/boq')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <span>←</span>
            <span>Back to BOQs</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{boq.boqNumber}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                    boq.status
                  )}`}
                >
                  {boq.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-xl text-gray-700">{boq.title}</p>
            </div>

            <div className="flex gap-3">
              {canEdit && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                >
                  + Add Line Item
                </button>
              )}
              {canSubmit && (
                <button
                  onClick={handleSubmitForReview}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg transition-all"
                >
                  Submit for Review
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500 mb-1">Line Items</p>
            <p className="text-2xl font-bold text-gray-900">{boq.lineItems.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500 mb-1">Total Quantity</p>
            <p className="text-2xl font-bold text-blue-600">{formatNumber(boq.totalQuantity)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500 mb-1">Total Weight (kg)</p>
            <p className="text-2xl font-bold text-purple-600">{formatNumber(boq.totalWeightKg)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500 mb-1">Estimated Cost (ZAR)</p>
            <p className="text-2xl font-bold text-green-600">
              {boq.totalEstimatedCost ? `R ${formatNumber(boq.totalEstimatedCost)}` : 'TBD'}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
          </div>

          {boq.lineItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Line Items</h3>
              <p className="text-gray-500 mb-4">Add line items to this BOQ</p>
              {canEdit && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add First Line Item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Weight (kg)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    {canEdit && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {boq.lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.lineNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.itemCode || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {ITEM_TYPES.find((t) => t.value === item.itemType)?.label || item.itemType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.unitOfMeasure}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatNumber(item.totalWeightKg)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.unitPrice ? `R ${formatNumber(item.unitPrice)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {item.totalPrice ? `R ${formatNumber(item.totalPrice)}` : '-'}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLineItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Details</h2>
            {boq.description && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">{boq.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium text-gray-900">{boq.createdBy.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(boq.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">{formatDate(boq.updatedAt)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Linked Items</h2>
            <div className="space-y-4">
              {boq.drawing ? (
                <div>
                  <p className="text-sm text-gray-500">Drawing</p>
                  <button
                    onClick={() => router.push(`/drawings/${boq.drawing!.id}`)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {boq.drawing.drawingNumber}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Drawing</p>
                  <p className="text-gray-400">Not linked</p>
                </div>
              )}
              {boq.rfq ? (
                <div>
                  <p className="text-sm text-gray-500">RFQ</p>
                  <button
                    onClick={() => router.push(`/rfqs/${boq.rfq!.id}`)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {boq.rfq.rfqNumber}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">RFQ</p>
                  <p className="text-gray-400">Not linked</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Line Item Modal */}
        {(showAddModal || editingItem) && (
          <LineItemModal
            item={editingItem}
            onClose={() => {
              setShowAddModal(false);
              setEditingItem(null);
            }}
            onSave={(item) => {
              if (editingItem) {
                handleUpdateLineItem(editingItem.id, item);
              } else {
                handleAddLineItem(item);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function LineItemModal({
  item,
  onClose,
  onSave,
}: {
  item: BoqLineItem | null;
  onClose: () => void;
  onSave: (item: Partial<BoqLineItem>) => void;
}) {
  const [formData, setFormData] = useState({
    itemCode: item?.itemCode || '',
    description: item?.description || '',
    itemType: item?.itemType || 'straight_pipe',
    unitOfMeasure: item?.unitOfMeasure || 'meters',
    quantity: item?.quantity?.toString() || '',
    unitWeightKg: item?.unitWeightKg?.toString() || '',
    unitPrice: item?.unitPrice?.toString() || '',
    notes: item?.notes || '',
    drawingReference: item?.drawingReference || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data: Partial<BoqLineItem> = {
      description: formData.description,
      itemType: formData.itemType,
      unitOfMeasure: formData.unitOfMeasure,
      quantity: parseFloat(formData.quantity),
    };

    if (formData.itemCode) data.itemCode = formData.itemCode;
    if (formData.unitWeightKg) data.unitWeightKg = parseFloat(formData.unitWeightKg);
    if (formData.unitPrice) data.unitPrice = parseFloat(formData.unitPrice);
    if (formData.notes) data.notes = formData.notes;
    if (formData.drawingReference) data.drawingReference = formData.drawingReference;

    onSave(data);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {item ? 'Edit Line Item' : 'Add Line Item'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
              <input
                type="text"
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                {ITEM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drawing Reference
              </label>
              <input
                type="text"
                value={formData.drawingReference}
                onChange={(e) => setFormData({ ...formData, drawingReference: e.target.value })}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Weight (kg)
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.unitWeightKg}
                onChange={(e) => setFormData({ ...formData, unitWeightKg: e.target.value })}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price (ZAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.description || !formData.quantity || saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : item ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
