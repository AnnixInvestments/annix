"use client";

import { useState } from "react";
import { SortHeader } from "@/app/components/shared/TableComponents";
import { CellText, FilterSelect, OpsTablePage, StatusBadge } from "../../components/OpsTablePage";
import { useOpsTable } from "../../hooks/useOpsTable";

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  supplierName: string | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  exportedToSageAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  EXTRACTED: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
};

const COMPANY_ID = 1;

function formatCurrency(amount: number | null): string {
  if (amount === null) return "-";
  return `R ${Number(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const extraParams: Record<string, string> = {};
  if (statusFilter) extraParams.status = statusFilter;
  if (typeFilter) extraParams.invoiceType = typeFilter;
  if (sourceFilter) extraParams.sourceModule = sourceFilter;

  const table = useOpsTable<Invoice>({
    endpoint: `/platform/companies/${COMPANY_ID}/invoices`,
    defaultSort: { key: "createdAt", direction: "desc" },
    extraParams,
  });

  return (
    <OpsTablePage
      title="Invoices"
      itemName="invoices"
      searchPlaceholder="Search by number, supplier..."
      isLoading={table.isLoading}
      isEmpty={table.items.length === 0}
      total={table.total}
      page={table.page}
      limit={table.limit}
      search={table.search}
      onSearchChange={table.setSearch}
      onPageChange={table.setPage}
      onPageSizeChange={(size) => {
        table.setLimit(size);
        table.setPage(1);
      }}
      filters={
        <>
          <FilterSelect
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="All Types"
            options={[
              { value: "SUPPLIER", label: "Supplier" },
              { value: "CUSTOMER", label: "Customer" },
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "EXTRACTED", label: "Extracted" },
              { value: "APPROVED", label: "Approved" },
            ]}
          />
          <FilterSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            placeholder="All Sources"
            options={[
              { value: "stock-control", label: "Stock Control" },
              { value: "au-rubber", label: "AU Rubber" },
            ]}
          />
        </>
      }
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader
              label="Invoice #"
              sortKey="invoiceNumber"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <SortHeader
              label="Supplier"
              sortKey="supplierName"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="invoiceDate"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Total"
              sortKey="totalAmount"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sage
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.items.map((inv) => {
            const typeClass =
              inv.invoiceType === "SUPPLIER"
                ? "bg-orange-50 text-orange-700"
                : "bg-blue-50 text-blue-700";
            const hasSage = inv.exportedToSageAt !== null;
            return (
              <tr key={inv.id} className="hover:bg-gray-50">
                <CellText value={inv.invoiceNumber} bold />
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${typeClass}`}
                  >
                    {inv.invoiceType}
                  </span>
                </td>
                <CellText value={inv.supplierName} />
                <CellText value={inv.invoiceDate} />
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-mono">
                  {formatCurrency(inv.totalAmount)}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <StatusBadge status={inv.status} colorMap={STATUS_COLORS} />
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {hasSage ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      Exported
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </OpsTablePage>
  );
}
