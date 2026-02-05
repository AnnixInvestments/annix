'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  rubberPortalApi,
  RubberOrderDto,
  RubberProductDto,
  RubberCompanyDto,
  RubberOrderItemDto,
  CallOff,
} from '@/app/lib/api/rubberPortalApi';
import { useToast } from '@/app/components/Toast';

const THICKNESS_OPTIONS = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
const WIDTH_OPTIONS = [600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500, 1570];
const LENGTH_OPTIONS = [5, 6, 7, 8, 9, 10, 12, 15, 20];

interface EditableItem {
  id?: number;
  productId?: number;
  thickness?: number;
  width?: number;
  length?: number;
  quantity?: number;
  callOffs: CallOff[];
}

export default function RubberOrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const { showToast } = useToast();

  const [order, setOrder] = useState<RubberOrderDto | null>(null);
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [statuses, setStatuses] = useState<{ value: number; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [editStatus, setEditStatus] = useState<number>(0);
  const [editCompanyId, setEditCompanyId] = useState<number | undefined>(undefined);
  const [editCompanyOrderNumber, setEditCompanyOrderNumber] = useState('');
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [orderData, productsData, companiesData, statusesData] = await Promise.all([
        rubberPortalApi.orderById(orderId),
        rubberPortalApi.products(),
        rubberPortalApi.companies(),
        rubberPortalApi.orderStatuses(),
      ]);
      setOrder(orderData);
      setProducts(productsData);
      setCompanies(companiesData);
      setStatuses(statusesData);

      setEditStatus(orderData.status);
      setEditCompanyId(orderData.companyId || undefined);
      setEditCompanyOrderNumber(orderData.companyOrderNumber || '');
      setEditItems(
        orderData.items.map((item) => ({
          id: item.id,
          productId: item.productId || undefined,
          thickness: item.thickness || undefined,
          width: item.width || undefined,
          length: item.length || undefined,
          quantity: item.quantity || undefined,
          callOffs: item.callOffs || [],
        }))
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load order';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchData();
    }
  }, [orderId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await rubberPortalApi.updateOrder(orderId, {
        status: editStatus,
        companyId: editCompanyId,
        companyOrderNumber: editCompanyOrderNumber || undefined,
        items: editItems.filter((item) => item.productId).map((item) => ({
          productId: item.productId,
          thickness: item.thickness,
          width: item.width,
          length: item.length,
          quantity: item.quantity,
          callOffs: item.callOffs,
        })),
      });
      showToast('Order updated', 'success');
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order';
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = () => {
    setEditItems([...editItems, { callOffs: [] }]);
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<EditableItem>) => {
    const newItems = [...editItems];
    newItems[index] = { ...newItems[index], ...updates };
    setEditItems(newItems);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const productById = (id: number | undefined) => products.find((p) => p.id === id);

  const calculateKgPerRoll = (item: EditableItem) => {
    const product = productById(item.productId);
    if (!product?.specificGravity || !item.thickness || !item.width || !item.length) return null;
    const thicknessMm = item.thickness;
    const widthMm = item.width;
    const lengthM = item.length;
    const volumeCm3 = (thicknessMm / 10) * (widthMm / 10) * (lengthM * 100);
    return (volumeCm3 * product.specificGravity) / 1000;
  };

  const calculateTotalKg = (item: EditableItem) => {
    const kgPerRoll = calculateKgPerRoll(item);
    if (kgPerRoll === null || !item.quantity) return null;
    return kgPerRoll * item.quantity;
  };

  const calculatePricePerRoll = (item: EditableItem) => {
    const kgPerRoll = calculateKgPerRoll(item);
    const product = productById(item.productId);
    if (kgPerRoll === null || !product?.pricePerKg) return null;
    return kgPerRoll * product.pricePerKg;
  };

  const calculateTotalPrice = (item: EditableItem) => {
    const pricePerRoll = calculatePricePerRoll(item);
    if (pricePerRoll === null || !item.quantity) return null;
    return pricePerRoll * item.quantity;
  };

  const calloffSummary = (item: EditableItem) => {
    const totalCalled = item.callOffs.reduce((sum, c) => sum + c.quantity, 0);
    const qty = item.quantity || 0;
    return { called: totalCalled, total: qty, remaining: qty - totalCalled };
  };

  const addCalloff = (itemIndex: number, quantity: number) => {
    const item = editItems[itemIndex];
    const summary = calloffSummary(item);
    if (quantity > summary.remaining) {
      showToast('Cannot call off more than remaining quantity', 'error');
      return;
    }
    const newCalloff: CallOff = {
      quantity,
      quantityRemaining: summary.remaining - quantity,
      events: [{ timestamp: Date.now(), status: 3 }],
    };
    updateItem(itemIndex, { callOffs: [...item.callOffs, newCalloff] });
  };

  const removeCalloff = (itemIndex: number, calloffIndex: number) => {
    const item = editItems[itemIndex];
    const newCalloffs = item.callOffs.filter((_, i) => i !== calloffIndex);
    updateItem(itemIndex, { callOffs: newCalloffs });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Order</div>
          <p className="text-gray-600">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-500 text-lg font-semibold mb-2">Order Not Found</div>
          <Link href="/admin/portal/rubber/orders" className="text-blue-600 hover:text-blue-800">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const selectedCompany = companies.find((c) => c.id === editCompanyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/admin/portal/rubber/orders" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(order.status)}`}>
              {order.statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Created {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <select
              value={editCompanyId ?? ''}
              onChange={(e) => setEditCompanyId(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Order Number</label>
            <input
              type="text"
              value={editCompanyOrderNumber}
              onChange={(e) => setEditCompanyOrderNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="PO-12345"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Order {order.orderNumber} Line Items</h2>
          <button
            onClick={addItem}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {editItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No items. Click "Add Item" to add products.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3"></th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Specific Gravity</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thickness</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Width</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Length</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kg/Roll</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Price/Kg</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price/Roll</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {editItems.map((item, index) => {
                  const product = productById(item.productId);
                  const kgPerRoll = calculateKgPerRoll(item);
                  const pricePerRoll = calculatePricePerRoll(item);
                  const totalPrice = calculateTotalPrice(item);
                  const summary = calloffSummary(item);
                  const isExpanded = expandedItems.has(index);

                  return (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleExpand(index)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg
                              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-3 py-3">
                          <select
                            value={item.productId ?? ''}
                            onChange={(e) => updateItem(index, { productId: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full min-w-[200px] rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title || `Product #${p.id}`}
                              </option>
                            ))}
                          </select>
                          {product && (
                            <div className="text-xs text-gray-500 mt-1">
                              {[product.compoundOwnerName, product.compoundName, product.hardnessName, product.typeName, product.colourName]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-900">
                          {product?.specificGravity ?? '-'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={item.thickness ?? ''}
                            onChange={(e) => updateItem(index, { thickness: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">-</option>
                            {THICKNESS_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t} mm</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={item.width ?? ''}
                            onChange={(e) => updateItem(index, { width: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">-</option>
                            {WIDTH_OPTIONS.map((w) => (
                              <option key={w} value={w}>{w} mm</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={item.length ?? ''}
                            onChange={(e) => updateItem(index, { length: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">-</option>
                            {LENGTH_OPTIONS.map((l) => (
                              <option key={l} value={l}>{l} m</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-900">
                          {kgPerRoll !== null ? `${kgPerRoll.toFixed(1)} Kg` : '-'}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-900">
                          {product?.pricePerKg ? formatCurrency(product.pricePerKg) : '-'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => updateItem(index, { quantity: Math.max(0, (item.quantity || 0) - 1) })}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <input
                              type="number"
                              value={item.quantity ?? ''}
                              onChange={(e) => updateItem(index, { quantity: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-12 text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1"
                              min="0"
                            />
                            <button
                              onClick={() => updateItem(index, { quantity: (item.quantity || 0) + 1 })}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(pricePerRoll)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(totalPrice)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => toggleExpand(index)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Calloff"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={13} className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900">Calloff Request Details</h4>
                                <span className="text-sm text-gray-500">
                                  {summary.called} of {summary.total} rolls called off
                                </span>
                              </div>

                              {item.callOffs.length > 0 && (
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead>
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Calloff</th>
                                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Remaining After</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Events</th>
                                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.callOffs.map((calloff, cIndex) => (
                                      <tr key={cIndex}>
                                        <td className="px-3 py-2 text-sm text-gray-900">
                                          {calloff.quantity} of {summary.total} rolls
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-900">{calloff.quantity}</td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-900">{calloff.quantityRemaining}</td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                          {calloff.events.map((event, eIndex) => (
                                            <div key={eIndex}>
                                              {new Date(event.timestamp).toLocaleDateString()} - {statusLabel(event.status)}
                                            </div>
                                          ))}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <button
                                            onClick={() => removeCalloff(index, cIndex)}
                                            className="text-red-600 hover:text-red-800"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {summary.remaining > 0 && (
                                <div className="flex items-center space-x-4 pt-2 border-t">
                                  <span className="text-sm text-gray-600">Remaining {summary.remaining} rolls</span>
                                  <CalloffInput
                                    maxQuantity={summary.remaining}
                                    onAdd={(qty) => addCalloff(index, qty)}
                                  />
                                </div>
                              )}

                              {summary.remaining === 0 && item.callOffs.length > 0 && (
                                <div className="text-sm text-green-600 font-medium">
                                  All rolls have been called off
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editItems.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex justify-end space-x-8">
              <div className="text-sm">
                <span className="text-gray-500">Total Items:</span>{' '}
                <span className="font-medium">{editItems.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total Quantity:</span>{' '}
                <span className="font-medium">{editItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total:</span>{' '}
                <span className="font-medium text-lg">
                  {formatCurrency(
                    editItems.reduce((sum, item) => sum + (calculateTotalPrice(item) || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CalloffInput({ maxQuantity, onAdd }: { maxQuantity: number; onAdd: (qty: number) => void }) {
  const [quantity, setQuantity] = useState(0);

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setQuantity(Math.max(0, quantity - 1))}
        className="p-1 text-gray-400 hover:text-gray-600 border rounded"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(0, Number(e.target.value))))}
        className="w-16 text-center rounded-md border-gray-300 shadow-sm text-sm border p-1"
        min="0"
        max={maxQuantity}
      />
      <button
        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
        className="p-1 text-gray-400 hover:text-gray-600 border rounded"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span className="text-sm text-gray-500">rolls only</span>
      <button
        onClick={() => {
          if (quantity > 0) {
            onAdd(quantity);
            setQuantity(0);
          }
        }}
        disabled={quantity === 0}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Add Calloff
      </button>
    </div>
  );
}

function statusColor(status: number): string {
  switch (status) {
    case -1: return 'bg-gray-100 text-gray-800';
    case 0: return 'bg-yellow-100 text-yellow-800';
    case 1: return 'bg-red-100 text-red-800';
    case 2: return 'bg-orange-100 text-orange-800';
    case 3: return 'bg-blue-100 text-blue-800';
    case 4: return 'bg-indigo-100 text-indigo-800';
    case 5: return 'bg-purple-100 text-purple-800';
    case 6: return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function statusLabel(status: number): string {
  switch (status) {
    case -1: return 'New';
    case 0: return 'Draft';
    case 1: return 'Cancelled';
    case 2: return 'Partially Submitted';
    case 3: return 'Submitted';
    case 4: return 'Manufacturing';
    case 5: return 'Delivering';
    case 6: return 'Complete';
    default: return 'Unknown';
  }
}
