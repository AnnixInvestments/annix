"use client";

import React from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
      <div className="text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mx-auto h-12 w-12 text-gray-400 mb-3">{icon}</div>}
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
}

export function SortHeader({ label, sortKey, currentSort, onSort }: SortHeaderProps) {
  const isActive = currentSort.key === sortKey;

  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center">
        {label}
        <span className="ml-1 inline-block">
          {isActive ? (
            currentSort.direction === "asc" ? (
              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )
          ) : (
            <svg
              className="w-4 h-4 inline text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          )}
        </span>
      </div>
    </th>
  );
}
