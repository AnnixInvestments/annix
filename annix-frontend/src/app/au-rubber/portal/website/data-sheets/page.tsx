"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  Pagination,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import { auRubberApiClient, type CompoundDataSheetDto } from "@/app/lib/api/auRubberApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useAuRubberDataSheets } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys/rubberKeys";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

const ITEMS_PER_PAGE = 25;

export default function DataSheetsListPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const queryClient = useQueryClient();
  const sheetsQuery = useAuRubberDataSheets();
  const rawData = sheetsQuery.data;
  const sheets = rawData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auRubber.dataSheets.pageSize",
    ITEMS_PER_PAGE,
  );
  const [deleteTarget, setDeleteTarget] = useState<CompoundDataSheetDto | null>(null);

  const filtered = sheets.filter((sheet) => {
    const q = searchQuery.toLowerCase();
    return (
      sheet.name.toLowerCase().includes(q) ||
      sheet.slug.toLowerCase().includes(q) ||
      sheet.code.toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleTogglePublish = async (sheet: CompoundDataSheetDto) => {
    try {
      await auRubberApiClient.updateDataSheet(sheet.id, { isPublished: !sheet.isPublished });
      queryClient.invalidateQueries({ queryKey: rubberKeys.dataSheets.all });
      const action = sheet.isPublished ? "unpublished" : "published";
      showToast(`"${sheet.name}" ${action}`, "success");
    } catch {
      alert({ message: "Failed to update data sheet", variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await auRubberApiClient.deleteDataSheet(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: rubberKeys.dataSheets.all });
      showToast(`"${deleteTarget.name}" deleted`, "success");
      setDeleteTarget(null);
    } catch {
      alert({ message: "Failed to delete data sheet", variant: "error" });
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/website"]}>
      {AlertDialog}
      <Breadcrumb
        items={[
          { label: "Website Pages", href: "/au-rubber/portal/website" },
          { label: "Technical Data Sheets" },
        ]}
      />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Technical Data Sheets</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage the rubber compound data sheets shown on the AU Industries website
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/au-industries/technical-data-sheets"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              View Live Page
            </a>
            <Link
              href="/au-rubber/portal/website/data-sheets/new"
              className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
            >
              New Data Sheet
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search by name, code or slug..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          {sheetsQuery.isLoading ? (
            <TableLoadingState message="Loading data sheets..." />
          ) : paginated.length === 0 ? (
            <TableEmptyState
              icon={<TableIcons.document />}
              title={searchQuery ? "No data sheets match your search" : "No data sheets yet"}
              subtitle={
                searchQuery ? "Try a different search term" : "Add your first compound data sheet"
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PDF
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
                  {paginated.map((sheet) => (
                    <DataSheetRow
                      key={sheet.id}
                      sheet={sheet}
                      onTogglePublish={() => handleTogglePublish(sheet)}
                      onDelete={() => setDeleteTarget(sheet)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          itemName="data sheets"
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(0);
          }}
        />
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Data Sheet"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequirePermission>
  );
}

function DataSheetRow(props: {
  sheet: CompoundDataSheetDto;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const sheet = props.sheet;
  const code = sheet.code;
  const hasPdf = sheet.pdfStatus === "available" && sheet.pdfUrl !== null;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <Link
          href={`/au-rubber/portal/website/data-sheets/${sheet.id}`}
          className="text-sm font-medium text-gray-900 hover:text-yellow-600"
        >
          {sheet.name}
        </Link>
        <div className="text-xs text-gray-400 font-mono mt-0.5">{code || sheet.slug}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sheet.category}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            hasPdf ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {hasPdf ? "PDF" : "Coming soon"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={props.onTogglePublish}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            sheet.isPublished
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          {sheet.isPublished ? "Published" : "Draft"}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <Link
          href={`/au-rubber/portal/website/data-sheets/${sheet.id}`}
          className="text-yellow-600 hover:text-yellow-900 mr-4"
        >
          Edit
        </Link>
        <button onClick={props.onDelete} className="text-red-600 hover:text-red-900">
          Delete
        </button>
      </td>
    </tr>
  );
}
