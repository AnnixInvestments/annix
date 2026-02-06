'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { type SupplierBoqListItem, type SupplierBoqStatus } from '@/app/lib/api/supplierApi';
import { formatDateZA, fromISO, now } from '@/app/lib/datetime';
import { useSupplierBoqs } from '@/app/lib/query/hooks';

const statusColors: Record<SupplierBoqStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  viewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Viewed' },
  quoted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Quoted' },
  declined: { bg: 'bg-red-100', text: 'text-red-800', label: 'Declined' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
};

const isBoqOpen = (boq: SupplierBoqListItem): boolean => {
  if (boq.status === 'expired' || boq.status === 'declined' || boq.status === 'quoted') {
    return false;
  }
  if (boq.projectInfo?.requiredDate) {
    const deadline = fromISO(boq.projectInfo.requiredDate);
    return deadline > now();
  }
  return true;
};

const getDaysUntilDeadline = (dateString?: string): number | null => {
  if (!dateString) return null;
  const deadline = fromISO(dateString).startOf('day');
  const today = now().startOf('day');
  const diffDays = deadline.diff(today, 'days').days;
  return Math.ceil(diffDays);
};

export default function SupplierBoqsPage() {
  const [filterStatus, setFilterStatus] = useState<SupplierBoqStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusFilter = filterStatus === 'all' ? undefined : filterStatus;
  const boqsQuery = useSupplierBoqs(statusFilter);
  const boqs = boqsQuery.data ?? [];

  const filteredBoqs = boqs.filter((boq) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      boq.boqNumber.toLowerCase().includes(search) ||
      boq.title?.toLowerCase().includes(search) ||
      boq.projectInfo?.name?.toLowerCase().includes(search) ||
      boq.customerInfo?.company?.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return formatDateZA(dateString);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">BOQ Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and respond to quotation requests from customers
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by BOQ number, project, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as SupplierBoqStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="viewed">Viewed</option>
              <option value="quoted">Quoted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {boqsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading BOQ requests...</span>
          </div>
        ) : boqsQuery.error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{boqsQuery.error instanceof Error ? boqsQuery.error.message : 'Failed to load BOQs'}</div>
            <button
              onClick={() => boqsQuery.refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : filteredBoqs.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No BOQ requests</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'No BOQs match your search criteria.'
                : 'You have not received any quotation requests yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BOQ Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open/Closed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBoqs.map((boq) => {
                  const statusStyle = statusColors[boq.status];
                  const open = isBoqOpen(boq);
                  const daysUntil = getDaysUntilDeadline(boq.projectInfo?.requiredDate);
                  return (
                    <tr key={boq.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{boq.boqNumber}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {boq.customerInfo?.company || boq.customerInfo?.name || '-'}
                        </div>
                        {boq.customerInfo?.email && (
                          <div className="text-xs text-gray-500">{boq.customerInfo.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {boq.projectInfo?.name || boq.title || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            open
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {open ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {boq.projectInfo?.requiredDate ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {formatDate(boq.projectInfo.requiredDate)}
                            </div>
                            {daysUntil !== null && open && (
                              <div
                                className={`text-xs ${
                                  daysUntil <= 3
                                    ? 'text-red-600 font-medium'
                                    : daysUntil <= 7
                                    ? 'text-yellow-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {daysUntil === 0
                                  ? 'Closes today'
                                  : daysUntil === 1
                                  ? '1 day left'
                                  : `${daysUntil} days left`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(boq.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          href={`/supplier/portal/boqs/${boq.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
