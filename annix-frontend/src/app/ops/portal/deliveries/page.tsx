"use client";

import { useState } from "react";
import { SortHeader } from "@/app/components/shared/TableComponents";
import {
  CellText,
  FilterSelect,
  OpsTablePage,
  SourceBadge,
  StatusBadge,
} from "../../components/OpsTablePage";
import { useOpsTable } from "../../hooks/useOpsTable";

interface DeliveryNote {
  id: number;
  deliveryNumber: string;
  sourceModule: string;
  deliveryNoteType: string;
  status: string;
  supplierName: string | null;
  deliveryDate: string | null;
  supplierContact: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  EXTRACTED: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  LINKED: "bg-purple-50 text-purple-700",
  STOCK_CREATED: "bg-teal-50 text-teal-700",
};

const COMPANY_ID = 1;

export default function DeliveriesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const extraParams: Record<string, string> = {};
  if (statusFilter) extraParams.status = statusFilter;
  if (sourceFilter) extraParams.sourceModule = sourceFilter;

  const table = useOpsTable<DeliveryNote>({
    endpoint: `/platform/companies/${COMPANY_ID}/delivery-notes`,
    defaultSort: { key: "createdAt", direction: "desc" },
    extraParams,
  });

  return (
    <OpsTablePage
      title="Delivery Notes"
      itemName="delivery notes"
      searchPlaceholder="Search by DN number, supplier..."
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
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "EXTRACTED", label: "Extracted" },
              { value: "APPROVED", label: "Approved" },
              { value: "LINKED", label: "Linked" },
              { value: "STOCK_CREATED", label: "Stock Created" },
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
              label="DN Number"
              sortKey="deliveryNumber"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
            </th>
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
              sortKey="deliveryDate"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.items.map((dn) => {
            const contactName = dn.supplierContact?.name;
            const dnSupplier = dn.supplierName;
            const supplierName = contactName || dnSupplier || null;
            const date = dn.deliveryDate;
            return (
              <tr key={dn.id} className="hover:bg-gray-50">
                <CellText value={dn.deliveryNumber} bold />
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <SourceBadge source={dn.sourceModule} />
                </td>
                <CellText value={dn.deliveryNoteType} />
                <CellText value={supplierName} />
                <CellText value={date} />
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <StatusBadge status={dn.status} colorMap={STATUS_COLORS} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </OpsTablePage>
  );
}
