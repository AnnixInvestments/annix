'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { rubberPortalApi, RubberOrderDto, RubberProductDto, RubberCompanyDto } from '@/app/lib/api/rubberPortalApi';
import { useToast } from '@/app/components/Toast';

interface OrderItem {
  productId?: number;
  thickness?: number;
  width?: number;
  length?: number;
  quantity?: number;
}

export default function RubberOrderDetailPage() {
  const router = useRouter();
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
  const [editItems, setEditItems] = useState<OrderItem[]>([]);

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
          productId: item.productId || undefined,
          thickness: item.thickness || undefined,
          width: item.width || undefined,
          length: item.length || undefined,
          quantity: item.quantity || undefined,
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
        items: editItems.filter((item) => item.productId),
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
    setEditItems([...editItems, {}]);
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: number | undefined) => {
    const newItems = [...editItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditItems(newItems);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="col-span-2">
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

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Order Items</h2>
              <button
                onClick={addItem}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>

            {editItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items. Click "Add Item" to add products.
              </div>
            ) : (
              <div className="space-y-4">
                {editItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-5 sm:col-span-2">
                        <label className="block text-xs text-gray-500">Product</label>
                        <select
                          value={item.productId ?? ''}
                          onChange={(e) =>
                            updateItem(index, 'productId', e.target.value ? Number(e.target.value) : undefined)
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.title || `Product #${product.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Thickness (mm)</label>
                        <input
                          type="number"
                          value={item.thickness ?? ''}
                          onChange={(e) =>
                            updateItem(index, 'thickness', e.target.value ? Number(e.target.value) : undefined)
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Width (mm)</label>
                        <input
                          type="number"
                          value={item.width ?? ''}
                          onChange={(e) =>
                            updateItem(index, 'width', e.target.value ? Number(e.target.value) : undefined)
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Length (m)</label>
                        <input
                          type="number"
                          value={item.length ?? ''}
                          onChange={(e) =>
                            updateItem(index, 'length', e.target.value ? Number(e.target.value) : undefined)
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity ?? ''}
                          onChange={(e) =>
                            updateItem(index, 'quantity', e.target.value ? Number(e.target.value) : undefined)
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Order Number</dt>
                <dd className="text-sm font-medium text-gray-900">{order.orderNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Company</dt>
                <dd className="text-sm font-medium text-gray-900">{order.companyName || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Items</dt>
                <dd className="text-sm font-medium text-gray-900">{order.items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Quantity</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Weight</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {order.items.reduce((sum, item) => sum + (item.totalKg || 0), 0).toFixed(2)} kg
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-500">{new Date(order.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusColor(status: number): string {
  switch (status) {
    case -1:
      return 'bg-gray-100 text-gray-800';
    case 0:
      return 'bg-yellow-100 text-yellow-800';
    case 1:
      return 'bg-red-100 text-red-800';
    case 2:
      return 'bg-orange-100 text-orange-800';
    case 3:
      return 'bg-blue-100 text-blue-800';
    case 4:
      return 'bg-indigo-100 text-indigo-800';
    case 5:
      return 'bg-purple-100 text-purple-800';
    case 6:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
