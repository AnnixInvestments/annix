"use client";

import type { ReactNode } from "react";
import {
  Pagination,
  TableEmptyState,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { EmptySearchIcon } from "./EmptyIcon";

interface OpsTablePageProps {
  title: string;
  itemName: string;
  isLoading: boolean;
  isEmpty: boolean;
  total: number;
  page: number;
  limit: number;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  children: ReactNode;
}

export function OpsTablePage(props: OpsTablePageProps) {
  const searchPlaceholder = props.searchPlaceholder;
  const placeholder = searchPlaceholder || `Search ${props.itemName}...`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">{props.title}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder={placeholder}
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 w-64"
        />
        {props.filters}
      </div>

      {props.isLoading ? (
        <TableLoadingState message={`Loading ${props.itemName}...`} />
      ) : props.isEmpty ? (
        <TableEmptyState
          icon={<EmptySearchIcon />}
          title={`No ${props.itemName} found`}
          subtitle="Try adjusting your filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            {props.children}
          </div>

          <Pagination
            currentPage={props.page}
            totalItems={props.total}
            itemsPerPage={props.limit}
            itemName={props.itemName}
            onPageChange={props.onPageChange}
            onPageSizeChange={props.onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}

export interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}

export function FilterSelect(props: FilterSelectProps) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none"
    >
      <option value="">{props.placeholder}</option>
      {props.options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function StatusBadge(props: { status: string; colorMap: Record<string, string> }) {
  const mapped = props.colorMap[props.status];
  const colorClass = mapped || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {props.status}
    </span>
  );
}

export function SourceBadge(props: { source: string }) {
  const labels: Record<string, string> = { "stock-control": "SC", "au-rubber": "AR" };
  const mapped = labels[props.source];
  const label = mapped || props.source;
  return (
    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
      {label}
    </span>
  );
}

export function SageBadge(props: { isMapped: boolean }) {
  if (props.isMapped) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        Mapped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      Unmapped
    </span>
  );
}

export function CellText(props: { value: string | null; bold?: boolean }) {
  const val = props.value;
  const text = val || "-";
  const className = props.bold
    ? "px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap"
    : "px-4 py-3 text-sm text-gray-500 whitespace-nowrap";
  return <td className={className}>{text}</td>;
}
