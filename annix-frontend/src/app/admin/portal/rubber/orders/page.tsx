'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { rubberPortalApi, RubberOrderDto, RubberCompanyDto } from '@/app/lib/api/rubberPortalApi';
import { useToast } from '@/app/components/Toast';

export default function RubberOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<RubberOrderDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [statuses, setStatuses] = useState<{ value: number; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderCompanyId, setNewOrderCompanyId] = useState<number | undefined>(undefined);
  const [newOrderCompanyOrderNumber, setNewOrderCompanyOrderNumber] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [ordersData, companiesData, statusesData] = await Promise.all([
        rubberPortalApi.orders(statusFilter),
        rubberPortalApi.companies(),
        rubberPortalApi.orderStatuses(),
      ]);
      setOrders(ordersData);
      setCompanies(companiesData);
      setStatuses(statusesData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load orders';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleCreateOrder = async () => {
    try {
      setIsCreating(true);
      const order = await rubberPortalApi.createOrder({
        companyId: newOrderCompanyId,
        companyOrderNumber: newOrderCompanyOrderNumber || undefined,
      });
      showToast(`Order ${order.orderNumber} created`, 'success');
      setShowNewOrderModal(false);
      setNewOrderCompanyId(undefined);
      setNewOrderCompanyOrderNumber('');
      fetchOrders();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      showToast(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await rubberPortalApi.deleteOrder(id);
      showToast('Order deleted', 'success');
      fetchOrders();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete order';
      showToast(errorMessage, 'error');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Orders</div>
          <p className="text-gray-600">{error}</p>
          <button onClick={fetchOrders} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rubber Lining Orders</h1>
          <p className="mt-1 text-sm text-gray-600">Manage rubber lining orders and deliveries</p>
        </div>
        <button
          onClick={() => setShowNewOrderModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter !== undefined ? 'Try adjusting your filter' : 'Get started by creating a new order'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Order #
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/admin/portal/rubber/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.companyOrderNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.companyName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(order.status)}`}>
                      {order.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.items.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowNewOrderModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <select
                    value={newOrderCompanyId ?? ''}
                    onChange={(e) => setNewOrderCompanyId(e.target.value ? Number(e.target.value) : undefined)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Order Number (optional)</label>
                  <input
                    type="text"
                    value={newOrderCompanyOrderNumber}
                    onChange={(e) => setNewOrderCompanyOrderNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="PO-12345"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
