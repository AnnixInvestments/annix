"use client";

import { useState } from "react";
import { SortHeader } from "@/app/components/shared/TableComponents";
import {
  CellText,
  FilterSelect,
  OpsTablePage,
  StatusBadge,
} from "../../../components/OpsTablePage";
import { useOpsTable } from "../../../hooks/useOpsTable";

interface Certificate {
  id: number;
  certificateCategory: string;
  certificateNumber: string | null;
  batchNumber: string | null;
  supplierName: string | null;
  compoundCode: string | null;
  processingStatus: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  EXTRACTED: "bg-blue-50 text-blue-700",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  COA: "CoA",
  COC: "CoC",
  COMPOUNDER: "Compounder",
  CALENDARER: "Calendarer",
  CALENDER_ROLL: "Calender Roll",
  CALIBRATION: "Calibration",
};

const COMPANY_ID = 1;

export default function CertificatesPage() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const extraParams: Record<string, string> = {};
  if (categoryFilter) extraParams.certificateCategory = categoryFilter;
  if (statusFilter) extraParams.processingStatus = statusFilter;

  const table = useOpsTable<Certificate>({
    endpoint: `/platform/companies/${COMPANY_ID}/certificates`,
    defaultSort: { key: "createdAt", direction: "desc" },
    extraParams,
  });

  return (
    <OpsTablePage
      title="Certificates"
      itemName="certificates"
      searchPlaceholder="Search by number, batch, supplier..."
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
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
            options={[
              { value: "COA", label: "CoA" },
              { value: "COC", label: "CoC" },
              { value: "COMPOUNDER", label: "Compounder" },
              { value: "CALENDARER", label: "Calendarer" },
              { value: "CALENDER_ROLL", label: "Calender Roll" },
              { value: "CALIBRATION", label: "Calibration" },
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "EXTRACTED", label: "Extracted" },
              { value: "NEEDS_REVIEW", label: "Needs Review" },
              { value: "APPROVED", label: "Approved" },
            ]}
          />
        </>
      }
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader
              label="Certificate #"
              sortKey="certificateNumber"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <SortHeader
              label="Batch"
              sortKey="batchNumber"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Supplier"
              sortKey="supplierName"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <SortHeader
              label="Compound"
              sortKey="compoundCode"
              currentSort={table.sort}
              onSort={table.handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.items.map((cert) => {
            const mappedCategory = CATEGORY_LABELS[cert.certificateCategory];
            const categoryLabel = mappedCategory || cert.certificateCategory;
            return (
              <tr key={cert.id} className="hover:bg-gray-50">
                <CellText value={cert.certificateNumber} bold />
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                    {categoryLabel}
                  </span>
                </td>
                <CellText value={cert.batchNumber} />
                <CellText value={cert.supplierName} />
                <CellText value={cert.compoundCode} />
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <StatusBadge status={cert.processingStatus} colorMap={STATUS_COLORS} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </OpsTablePage>
  );
}
