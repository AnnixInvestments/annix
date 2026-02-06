'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { type SupplierBoqListItem } from '@/app/lib/api/supplierApi';
import { formatDateZA, fromISO, now } from '@/app/lib/datetime';
import { useSupplierBoqs } from '@/app/lib/query/hooks';

const isRfqOpen = (boq: SupplierBoqListItem): boolean => {
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

export default function SubmittedBoqsPage() {
  const boqsQuery = useSupplierBoqs('quoted');
  const boqs = boqsQuery.data ?? [];
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Submitted BOQs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View your submitted quotes. You can amend pricing while the RFQ is still open.
        </p>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by BOQ number, project, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {boqsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading submitted BOQs...</span>
          </div>
        ) : boqsQuery.error ? (
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4">{boqsQuery.error instanceof Error ? boqsQuery.error.message : 'Failed to load submitted BOQs'}</div>
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No submitted BOQs</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm
                ? 'No submitted BOQs match your search criteria.'
                : 'You have not submitted any quotes yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    BOQ Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    RFQ Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Closes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredBoqs.map((boq) => {
                  const rfqOpen = isRfqOpen(boq);
                  const daysUntil = getDaysUntilDeadline(boq.projectInfo?.requiredDate);
                  return (
                    <tr key={boq.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-white">{boq.boqNumber}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {boq.customerInfo?.company || boq.customerInfo?.name || '-'}
                        </div>
                        {boq.customerInfo?.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{boq.customerInfo.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {boq.projectInfo?.name || boq.title || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rfqOpen
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {rfqOpen ? 'Open' : 'Closed'}
                        </span>
                        {rfqOpen && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            (Can amend)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {boq.projectInfo?.requiredDate ? (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formatDate(boq.projectInfo.requiredDate)}
                            </div>
                            {daysUntil !== null && rfqOpen && (
                              <div
                                className={`text-xs ${
                                  daysUntil <= 3
                                    ? 'text-red-600 dark:text-red-400 font-medium'
                                    : daysUntil <= 7
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-gray-500 dark:text-gray-400'
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
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(boq.respondedAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          href={`/supplier/portal/boqs/${boq.id}`}
                          className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            rfqOpen
                              ? 'border-orange-500 text-orange-600 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                              : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {rfqOpen ? 'View / Amend' : 'View Quote'}
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
