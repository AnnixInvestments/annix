"use client";

import React from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface SortIconProps {
  active: boolean;
  direction: SortDirection;
}

export function SortIcon(props: SortIconProps) {
  const { active, direction } = props;
  return (
    <span className="ml-1 inline-block">
      {active ? (
        direction === "asc" ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
  );
}

export interface SortHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
}

export function SortHeader(props: SortHeaderProps) {
  const { label, sortKey, currentSort, onSort } = props;
  const isActive = currentSort.key === sortKey;

  const ariaSort = isActive
    ? currentSort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th onClick={() => onSort(sortKey)} className={TABLE_HEADER_CLASSES} aria-sort={ariaSort}>
      <div className="flex items-center">
        {label}
        <SortIcon active={isActive} direction={currentSort.direction} />
      </div>
    </th>
  );
}

export interface TableLoadingStateProps {
  message?: string;
  spinnerClassName?: string;
}

export function TableLoadingState(props: TableLoadingStateProps) {
  const message = props.message || "Loading...";
  const spinnerClassName = props.spinnerClassName || "border-b-2 border-gray-600";
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className={`animate-spin rounded-full h-12 w-12 ${spinnerClassName} mx-auto`}></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export interface TableEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
}

export function TableEmptyState(props: TableEmptyStateProps) {
  const { icon, title, subtitle, action } = props;
  const buttonClassName = action?.className || "text-white bg-gray-600 hover:bg-gray-700";
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400">{icon}</div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium ${buttonClassName}`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {action.label}
        </button>
      )}
    </div>
  );
}

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 0] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  itemName: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  focusClassName?: string;
}

export function Pagination(props: PaginationProps) {
  const { currentPage, totalItems, itemsPerPage, itemName, onPageChange, onPageSizeChange } = props;
  const focusClassName = props.focusClassName || "focus:ring-gray-500 focus:border-gray-500";
  const showAll = itemsPerPage === 0 || itemsPerPage >= totalItems;
  const effectivePerPage = showAll ? totalItems : itemsPerPage;
  const totalPages = showAll ? 1 : Math.ceil(totalItems / effectivePerPage);

  if (totalItems <= itemsPerPage && !showAll) {
    return null;
  }

  const startItem = showAll ? 1 : currentPage * effectivePerPage + 1;
  const endItem = showAll ? totalItems : Math.min((currentPage + 1) * effectivePerPage, totalItems);

  return (
    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Showing {startItem} to {endItem} of {totalItems} {itemName}
        </span>
        {onPageSizeChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(0);
            }}
            className={`text-sm border border-gray-300 rounded-md px-2 py-1 text-gray-700 ${focusClassName}`}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size === 0 ? "All" : size}
              </option>
            ))}
          </select>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export const TABLE_HEADER_CLASSES =
  "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100";
export const TABLE_CELL_CLASSES = "px-6 py-4 whitespace-nowrap";

interface IconProps {
  className?: string;
}

export const TableIcons = {
  document: (props: IconProps) => (
    <svg
      className={props.className || "h-12 w-12"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  building: (props: IconProps) => (
    <svg
      className={props.className || "h-12 w-12"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  cube: (props: IconProps) => (
    <svg
      className={props.className || "h-12 w-12"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
  tag: (props: IconProps) => (
    <svg
      className={props.className || "h-12 w-12"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  ),
  currency: (props: IconProps) => (
    <svg
      className={props.className || "h-12 w-12"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};
