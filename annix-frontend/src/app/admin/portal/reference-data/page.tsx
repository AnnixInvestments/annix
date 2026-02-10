"use client";

import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import React, { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DataTable, DataTableToolbar } from "@/app/components/ui/DataTable";
import type { ColumnSchemaInfo, ReferenceDataModuleInfo } from "@/app/lib/api/adminApi";
import { exportToExcel } from "@/app/lib/export/exportTable";
import {
  useCreateReferenceData,
  useDeleteReferenceData,
  useReferenceDataModules,
  useReferenceDataRecords,
  useReferenceDataSchema,
  useUpdateReferenceData,
} from "@/app/lib/query/hooks";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { ReferenceDataFormModal } from "./ReferenceDataFormModal";

function formatCellValue(value: any, col: ColumnSchemaInfo): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
        No
      </span>
    );
  }

  if (typeof value === "object") {
    const displayField =
      value.name ?? value.code ?? value.displayName ?? value.title ?? `#${value.id}`;
    return <span className="text-blue-600">{displayField}</span>;
  }

  const numericTypes = ["number", "int", "integer", "float", "decimal", "double"];
  if (numericTypes.includes(col.type) && typeof value === "number") {
    return value.toLocaleString();
  }

  const strValue = String(value);
  if (strValue.length > 80) {
    return <span title={strValue}>{strValue.substring(0, 80)}...</span>;
  }

  return strValue;
}

function buildColumns(
  columns: ColumnSchemaInfo[],
  onEdit: (row: Record<string, any>) => void,
  onDelete: (row: Record<string, any>) => void,
): ColumnDef<Record<string, any>, any>[] {
  const dataColumns: ColumnDef<Record<string, any>, any>[] = columns
    .filter((col) => !col.isGenerated || col.isPrimary)
    .map((col) => ({
      id: col.propertyName,
      accessorKey: col.propertyName,
      header: col.propertyName
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/^./, (c) => c.toUpperCase()),
      cell: ({ getValue }: { getValue: () => any }) => formatCellValue(getValue(), col),
      enableSorting: true,
    }));

  const actionsColumn: ColumnDef<Record<string, any>, any> = {
    id: "actions",
    header: "",
    enableSorting: false,
    size: 100,
    cell: ({ row }: { row: { original: Record<string, any> } }) => (
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original);
          }}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Delete
        </button>
      </div>
    ),
  };

  return [...dataColumns, actionsColumn];
}

function groupModulesByCategory(
  modules: ReferenceDataModuleInfo[],
): Record<string, ReferenceDataModuleInfo[]> {
  return modules.reduce<Record<string, ReferenceDataModuleInfo[]>>((acc, mod) => {
    const existing = acc[mod.category] ?? [];
    return { ...acc, [mod.category]: [...existing, mod] };
  }, {});
}

function ModuleSidebar({
  modules,
  selectedEntity,
  onSelect,
  sidebarSearch,
  onSidebarSearchChange,
}: {
  modules: ReferenceDataModuleInfo[];
  selectedEntity: string | null;
  onSelect: (entityName: string) => void;
  sidebarSearch: string;
  onSidebarSearchChange: (v: string) => void;
}) {
  const filtered = sidebarSearch
    ? modules.filter(
        (m) =>
          m.displayName.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
          m.category.toLowerCase().includes(sidebarSearch.toLowerCase()),
      )
    : modules;

  const grouped = groupModulesByCategory(filtered);
  const sortedCategories = Object.keys(grouped).sort();

  return (
    <div className="w-72 flex-shrink-0 bg-white shadow rounded-lg overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      <div className="p-3 border-b">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
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
          </div>
          <input
            type="search"
            value={sidebarSearch}
            onChange={(e) => onSidebarSearchChange(e.target.value)}
            className="block w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Filter modules..."
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {sortedCategories.map((category) => (
          <div key={category}>
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
              {category}
            </div>
            {grouped[category].map((mod) => (
              <button
                key={mod.entityName}
                onClick={() => onSelect(mod.entityName)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${
                  selectedEntity === mod.entityName
                    ? "bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-600"
                    : "text-gray-700"
                }`}
              >
                <span className="truncate">{mod.displayName}</span>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{mod.recordCount}</span>
              </button>
            ))}
          </div>
        ))}
        {sortedCategories.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">No modules match filter</div>
        )}
      </div>
    </div>
  );
}

export default function ReferenceDataPage() {
  const { showToast } = useToast();

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    editRecord: Record<string, any> | null;
  }>({ open: false, editRecord: null });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    record: Record<string, any> | null;
  }>({ open: false, record: null });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const modulesQuery = useReferenceDataModules();
  const schemaQuery = useReferenceDataSchema(selectedEntity);
  const recordsQuery = useReferenceDataRecords(selectedEntity, {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sortBy: sorting[0]?.id ?? undefined,
    sortOrder: sorting[0] ? (sorting[0].desc ? "DESC" : "ASC") : undefined,
    search: activeSearch || undefined,
  });

  const createMutation = useCreateReferenceData(selectedEntity ?? "");
  const updateMutation = useUpdateReferenceData(selectedEntity ?? "");
  const deleteMutation = useDeleteReferenceData(selectedEntity ?? "");

  const modules = modulesQuery.data ?? [];
  const selectedModule = modules.find((m) => m.entityName === selectedEntity);
  const schemaColumns = schemaQuery.data?.columns ?? [];
  const schemaRelations = schemaQuery.data?.relations ?? [];
  const records = recordsQuery.data?.items ?? [];
  const totalRows = recordsQuery.data?.total ?? 0;

  const handleEntitySelect = (entityName: string) => {
    setSelectedEntity(entityName);
    setPagination({ pageIndex: 0, pageSize: 25 });
    setSorting([]);
    setSearch("");
    setActiveSearch("");
  };

  const handleSearch = () => {
    setActiveSearch(search);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleEdit = (row: Record<string, any>) => {
    setFormModal({ open: true, editRecord: row });
  };

  const handleDelete = (row: Record<string, any>) => {
    setDeleteError(null);
    setDeleteModal({ open: true, record: row });
  };

  const handleFormSave = (data: Record<string, any>) => {
    if (formModal.editRecord) {
      updateMutation.mutate(
        { id: formModal.editRecord.id, data },
        {
          onSuccess: () => {
            showToast("Record updated successfully", "success");
            setFormModal({ open: false, editRecord: null });
          },
          onError: (err) => showToast(`Error: ${err.message}`, "error"),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          showToast("Record created successfully", "success");
          setFormModal({ open: false, editRecord: null });
        },
        onError: (err) => showToast(`Error: ${err.message}`, "error"),
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal.record) return;
    deleteMutation.mutate(deleteModal.record.id, {
      onSuccess: (result) => {
        if (result.success) {
          showToast("Record deleted successfully", "success");
          setDeleteModal({ open: false, record: null });
        } else {
          setDeleteError(result.message);
        }
      },
      onError: (err) => setDeleteError(err.message),
    });
  };

  const handleExport = () => {
    if (!records.length || !schemaColumns.length || !selectedModule) return;

    const exportColumns = schemaColumns
      .filter((c) => !c.isGenerated || c.isPrimary)
      .map((c) => ({
        header: c.propertyName
          .replace(/([A-Z])/g, " $1")
          .trim()
          .replace(/^./, (ch) => ch.toUpperCase()),
        accessorKey: c.propertyName,
      }));

    const flatData = records.map((row) => {
      const flat: Record<string, any> = {};
      exportColumns.forEach(({ accessorKey }) => {
        const val = row[accessorKey];
        if (val !== null && typeof val === "object") {
          flat[accessorKey] = val.name ?? val.code ?? val.id ?? "";
        } else {
          flat[accessorKey] = val ?? "";
        }
      });
      return flat;
    });

    exportToExcel(flatData, exportColumns, selectedModule.displayName, selectedModule.displayName);
  };

  const columns = useMemo(
    () => buildColumns(schemaColumns, handleEdit, handleDelete),
    [schemaColumns],
  );

  const recordSummary = (record: Record<string, any> | null): string => {
    if (!record) return "";
    const nameFields = ["name", "code", "displayName", "title", "nps", "schedule"];
    const match = nameFields.find((f) => record[f]);
    if (match) return String(record[match]);
    return `ID ${record.id}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reference Data</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse and manage reference data tables ({modules.length} modules)
        </p>
      </div>

      <div className="flex gap-6">
        <ModuleSidebar
          modules={modules}
          selectedEntity={selectedEntity}
          onSelect={handleEntitySelect}
          sidebarSearch={sidebarSearch}
          onSidebarSearchChange={setSidebarSearch}
        />

        <div className="flex-1 min-w-0 space-y-4">
          {selectedEntity && selectedModule ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedModule.displayName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedModule.tableName} -- {totalRows} records
                  </p>
                </div>
              </div>

              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                onSearch={handleSearch}
                searchPlaceholder={`Search ${selectedModule.displayName}...`}
                onExport={records.length > 0 ? handleExport : undefined}
                extraActions={
                  <button
                    onClick={() => setFormModal({ open: true, editRecord: null })}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    New Record
                  </button>
                }
              />

              <DataTable
                columns={columns}
                data={records}
                totalRows={totalRows}
                pagination={pagination}
                onPaginationChange={(updater) => {
                  setPagination(typeof updater === "function" ? updater(pagination) : updater);
                }}
                sorting={sorting}
                onSortingChange={(updater) => {
                  setSorting(typeof updater === "function" ? updater(sorting) : updater);
                }}
                isLoading={recordsQuery.isLoading || schemaQuery.isLoading}
                emptyMessage={`No records in ${selectedModule.displayName}`}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </>
          ) : (
            <div className="bg-white shadow rounded-lg flex items-center justify-center h-96">
              <div className="text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                <p className="text-sm font-medium">Select a module from the sidebar</p>
                <p className="text-xs mt-1">Choose a reference data table to browse and edit</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {formModal.open && schemaQuery.data && (
        <ReferenceDataFormModal
          entityDisplayName={selectedModule?.displayName ?? ""}
          columns={schemaQuery.data.columns}
          relations={schemaQuery.data.relations}
          initialData={formModal.editRecord}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSave={handleFormSave}
          onCancel={() => setFormModal({ open: false, editRecord: null })}
        />
      )}

      {deleteModal.open && deleteModal.record && (
        <DeleteConfirmationModal
          entityName={selectedModule?.displayName ?? ""}
          recordId={deleteModal.record.id}
          recordSummary={recordSummary(deleteModal.record)}
          isDeleting={deleteMutation.isPending}
          deleteError={deleteError}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal({ open: false, record: null })}
        />
      )}
    </div>
  );
}
