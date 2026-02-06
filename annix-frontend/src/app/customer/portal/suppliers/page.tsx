'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  customerSupplierApi,
  PreferredSupplier,
  SupplierInvitation,
  DirectorySupplier,
  DirectoryFilters,
} from '@/app/lib/api/customerApi';
import { formatDateZA } from '@/app/lib/datetime';

type Tab = 'suppliers' | 'invitations' | 'directory';

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

export default function CustomerSuppliersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('suppliers');
  const [suppliers, setSuppliers] = useState<PreferredSupplier[]>([]);
  const [invitations, setInvitations] = useState<SupplierInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [directorySuppliers, setDirectorySuppliers] = useState<DirectorySupplier[]>([]);
  const [directoryFilters, setDirectoryFilters] = useState<DirectoryFilters>({});
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [addForm, setAddForm] = useState({
    supplierName: '',
    supplierEmail: '',
    priority: 0,
    notes: '',
  });
  const [addError, setAddError] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    supplierCompanyName: '',
    message: '',
  });
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingSupplier, setBlockingSupplier] = useState<DirectorySupplier | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [suppliersData, invitationsData] = await Promise.all([
        customerSupplierApi.getPreferredSuppliers(),
        customerSupplierApi.getInvitations(),
      ]);
      setSuppliers(suppliersData);
      setInvitations(invitationsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDirectory = useCallback(async () => {
    try {
      setDirectoryLoading(true);
      const data = await customerSupplierApi.supplierDirectory(directoryFilters);
      setDirectorySuppliers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load directory');
    } finally {
      setDirectoryLoading(false);
    }
  }, [directoryFilters]);

  useEffect(() => {
    if (activeTab === 'directory') {
      loadDirectory();
    }
  }, [activeTab, loadDirectory]);

  const handleAddSupplier = async () => {
    if (!addForm.supplierName || !addForm.supplierEmail) {
      setAddError('Name and email are required');
      return;
    }

    try {
      setAddingSupplier(true);
      setAddError(null);
      await customerSupplierApi.addPreferredSupplier({
        supplierName: addForm.supplierName,
        supplierEmail: addForm.supplierEmail,
        priority: addForm.priority,
        notes: addForm.notes || undefined,
      });
      await loadData();
      setShowAddModal(false);
      resetAddForm();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add supplier');
    } finally {
      setAddingSupplier(false);
    }
  };

  const handleRemoveSupplier = async (id: number) => {
    if (!confirm('Are you sure you want to remove this supplier from your preferred list?')) return;

    try {
      await customerSupplierApi.removePreferredSupplier(id);
      await loadData();
      if (activeTab === 'directory') {
        await loadDirectory();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove supplier');
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteForm.email) {
      setInviteError('Email is required');
      return;
    }

    try {
      setSendingInvite(true);
      setInviteError(null);
      await customerSupplierApi.createInvitation({
        email: inviteForm.email,
        supplierCompanyName: inviteForm.supplierCompanyName || undefined,
        message: inviteForm.message || undefined,
      });
      await loadData();
      setShowInviteModal(false);
      resetInviteForm();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvitation = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      await customerSupplierApi.cancelInvitation(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel invitation');
    }
  };

  const handleResendInvitation = async (id: number) => {
    try {
      await customerSupplierApi.resendInvitation(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resend invitation');
    }
  };

  const handleAddToPreferred = async (supplier: DirectorySupplier) => {
    try {
      await customerSupplierApi.addPreferredSupplier({
        supplierProfileId: supplier.supplierProfileId,
      });
      await loadData();
      await loadDirectory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add supplier to preferred list');
    }
  };

  const handleBlockSupplier = async () => {
    if (!blockingSupplier) return;

    try {
      setBlockSubmitting(true);
      await customerSupplierApi.blockSupplier(
        blockingSupplier.supplierProfileId,
        blockReason || undefined,
      );
      await loadData();
      await loadDirectory();
      setShowBlockModal(false);
      setBlockingSupplier(null);
      setBlockReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to block supplier');
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleUnblockSupplier = async (supplier: DirectorySupplier) => {
    try {
      await customerSupplierApi.unblockSupplier(supplier.supplierProfileId);
      await loadDirectory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unblock supplier');
    }
  };

  const resetAddForm = () => {
    setAddForm({ supplierName: '', supplierEmail: '', priority: 0, notes: '' });
    setAddError(null);
  };

  const resetInviteForm = () => {
    setInviteForm({ email: '', supplierCompanyName: '', message: '' });
    setInviteError(null);
  };

  const formatDate = (dateString: string) => {
    return formatDateZA(dateString);
  };

  const getInvitationStatusBadge = (invitation: SupplierInvitation) => {
    if (invitation.isExpired && invitation.status === 'pending') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          Expired
        </span>
      );
    }

    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepted' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expired' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    };
    const badge = badges[invitation.status] || badges.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const directoryStatusBadge = (status: DirectorySupplier['status']) => {
    if (status === 'preferred') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Preferred
        </span>
      );
    } else if (status === 'blocked') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Blocked
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          None
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-gray-600">Manage your preferred suppliers and invitations</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
          >
            Invite Supplier
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Supplier
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-600 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'suppliers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Preferred Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Invitations ({invitations.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'directory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Supplier Directory
          </button>
        </nav>
      </div>

      {activeTab === 'suppliers' && (
        <>
          {suppliers.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Preferred Suppliers</h3>
              <p className="text-gray-600 mb-4">
                Add suppliers to your preferred list to easily manage your supply chain.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{supplier.supplierName}</div>
                          {supplier.supplierEmail && (
                            <div className="text-sm text-gray-500">{supplier.supplierEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{supplier.priority}</td>
                      <td className="px-6 py-4">
                        {supplier.isRegistered ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Registered
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Unregistered
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(supplier.createdAt)}
                        {supplier.addedBy && (
                          <div className="text-xs text-gray-500">by {supplier.addedBy}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveSupplier(supplier.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'invitations' && (
        <>
          {invitations.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations</h3>
              <p className="text-gray-600 mb-4">
                Invite suppliers to register on the platform and join your preferred list.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{invitation.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {invitation.supplierCompanyName || '-'}
                      </td>
                      <td className="px-6 py-4">{getInvitationStatusBadge(invitation)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(invitation.createdAt)}
                        {invitation.invitedBy && (
                          <div className="text-xs text-gray-500">by {invitation.invitedBy}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          Expires: {formatDate(invitation.expiresAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {invitation.status === 'pending' && !invitation.isExpired && (
                          <>
                            <button
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(invitation.isExpired || invitation.status === 'expired') && (
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'directory' && (
        <>
          <div className="bg-white shadow rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by company name..."
                  value={directoryFilters.search || ''}
                  onChange={(e) =>
                    setDirectoryFilters({ ...directoryFilters, search: e.target.value || undefined })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <select
                  value={directoryFilters.province || ''}
                  onChange={(e) =>
                    setDirectoryFilters({ ...directoryFilters, province: e.target.value || undefined })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Provinces</option>
                  {SA_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadDirectory}
                  disabled={directoryLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {directoryLoading ? 'Loading...' : 'Search'}
                </button>
              </div>
            </div>
          </div>

          {directoryLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading directory...</p>
              </div>
            </div>
          ) : directorySuppliers.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Suppliers Found</h3>
              <p className="text-gray-600 mb-4">
                No approved suppliers match your search criteria.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Province
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {directorySuppliers.map((supplier) => (
                    <tr key={supplier.supplierProfileId}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{supplier.companyName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{supplier.province || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {supplier.productLabels.slice(0, 3).map((label, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                            >
                              {label}
                            </span>
                          ))}
                          {supplier.productLabels.length > 3 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                              +{supplier.productLabels.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{directoryStatusBadge(supplier.status)}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {supplier.status === 'none' && (
                          <>
                            <button
                              onClick={() => handleAddToPreferred(supplier)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Add to Preferred
                            </button>
                            <button
                              onClick={() => {
                                setBlockingSupplier(supplier);
                                setShowBlockModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Block
                            </button>
                          </>
                        )}
                        {supplier.status === 'preferred' && supplier.preferredSupplierId && (
                          <>
                            <button
                              onClick={() => handleRemoveSupplier(supplier.preferredSupplierId!)}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Remove from Preferred
                            </button>
                            <button
                              onClick={() => {
                                setBlockingSupplier(supplier);
                                setShowBlockModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Block
                            </button>
                          </>
                        )}
                        {supplier.status === 'blocked' && (
                          <button
                            onClick={() => handleUnblockSupplier(supplier)}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Unblock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-30"
              onClick={() => {
                setShowAddModal(false);
                resetAddForm();
              }}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Preferred Supplier</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add an unregistered supplier to your preferred list. They will be able to receive RFQs
                but won&apos;t have portal access until they register.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.supplierName}
                    onChange={(e) => setAddForm({ ...addForm, supplierName: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Supplier Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={addForm.supplierEmail}
                    onChange={(e) => setAddForm({ ...addForm, supplierEmail: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="supplier@company.co.za"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <input
                    type="number"
                    value={addForm.priority}
                    onChange={(e) => setAddForm({ ...addForm, priority: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">Lower numbers = higher priority</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={2}
                    placeholder="Optional notes about this supplier"
                  />
                </div>

                {addError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{addError}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetAddForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  disabled={addingSupplier}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {addingSupplier ? 'Adding...' : 'Add Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-30"
              onClick={() => {
                setShowInviteModal(false);
                resetInviteForm();
              }}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Supplier</h2>
              <p className="text-sm text-gray-600 mb-4">
                Send an invitation to a supplier to register on the platform. They will be
                automatically added to your preferred list when they complete registration.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="supplier@company.co.za"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name (optional)
                  </label>
                  <input
                    type="text"
                    value={inviteForm.supplierCompanyName}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, supplierCompanyName: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Supplier Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message (optional)
                  </label>
                  <textarea
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add a personal message to the invitation email"
                  />
                </div>

                {inviteError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{inviteError}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    resetInviteForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvitation}
                  disabled={sendingInvite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {sendingInvite ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && blockingSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-30"
              onClick={() => {
                setShowBlockModal(false);
                setBlockingSupplier(null);
                setBlockReason('');
              }}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Block Supplier</h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to block <strong>{blockingSupplier.companyName}</strong>?
                {blockingSupplier.status === 'preferred' &&
                  ' This will also remove them from your preferred list.'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Why are you blocking this supplier?"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setBlockingSupplier(null);
                    setBlockReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockSupplier}
                  disabled={blockSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {blockSubmitting ? 'Blocking...' : 'Block Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
