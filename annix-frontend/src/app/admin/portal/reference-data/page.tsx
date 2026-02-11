"use client";

import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import {
  isBoolean,
  isFunction,
  isNumber,
  isObject,
  isString,
  kebabCase,
  keys,
} from "es-toolkit/compat";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  coerceFormValue,
  formatDefaultValue,
  HtmlInputType,
  htmlInputType,
  isDateLikeType,
  isNumericType,
} from "@/app/lib/reference-data/columnTypes";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { ReferenceDataFormModal } from "./ReferenceDataFormModal";

const BASE_PATH = "/admin/portal/reference-data";

function toKebab(value: string): string {
  return kebabCase(value);
}

function fromKebab(kebab: string, modules: ReferenceDataModuleInfo[]): string | null {
  return modules.find((m) => toKebab(m.entityName) === kebab)?.entityName ?? null;
}

interface InlineEditContext {
  editingRows: Record<number, Record<string, any>>;
  onEditValueChange: (rowId: number, field: string, value: any) => void;
}

function initValueForEdit(value: any, col: ColumnSchemaInfo): any {
  if (value === null || value === undefined) return null;
  if (isDateLikeType(col.type)) return formatDefaultValue(value, col.type);
  return value;
}

function InlineEditCell({
  col,
  value,
  onChange,
}: {
  col: ColumnSchemaInfo;
  value: any;
  onChange: (value: any) => void;
}) {
  const inputType = htmlInputType(col.type);

  if (inputType === HtmlInputType.Checkbox) {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
    );
  }

  return (
    <input
      type={inputType}
      value={value ?? ""}
      step={inputType === HtmlInputType.Number ? "any" : undefined}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-5 leading-5 bg-transparent border-0 p-0 text-sm text-gray-900 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

function formatCellValue(value: any, col: ColumnSchemaInfo): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  if (isBoolean(value)) {
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

  if (isObject(value)) {
    const obj = value as Record<string, any>;
    const displayField = obj.name ?? obj.code ?? obj.displayName ?? obj.title ?? `#${obj.id}`;
    return <span className="text-blue-600">{displayField}</span>;
  }

  if (isNumericType(col.type) && isNumber(value)) {
    return value.toLocaleString();
  }

  if (isDateLikeType(col.type) && isString(value)) {
    return value.substring(0, 10);
  }

  const strValue = String(value);
  if (strValue.length > 80) {
    return <span title={strValue}>{strValue.substring(0, 80)}...</span>;
  }

  return strValue;
}

function buildColumns(
  columns: ColumnSchemaInfo[],
  relationPropertyNames: Set<string>,
  onEdit: (row: Record<string, any>) => void,
  onCancelEdit: (rowId: number) => void,
  onDelete: (row: Record<string, any>) => void,
  inlineEditRef: { current: InlineEditContext },
): ColumnDef<Record<string, any>, any>[] {
  const dataColumns: ColumnDef<Record<string, any>, any>[] = columns
    .filter((col) => !col.isGenerated || col.isPrimary)
    .map((col) => {
      const isEditable =
        !col.isPrimary && !col.isGenerated && !relationPropertyNames.has(col.propertyName);

      return {
        id: col.propertyName,
        accessorKey: col.propertyName,
        header: col.propertyName
          .replace(/([A-Z])/g, " $1")
          .trim()
          .replace(/^./, (c) => c.toUpperCase()),
        cell: ({
          row,
          getValue,
        }: {
          row: { original: Record<string, any> };
          getValue: () => any;
        }) => {
          const ctx = inlineEditRef.current;
          const rowValues = ctx.editingRows[row.original.id];
          if (rowValues && isEditable) {
            return (
              <InlineEditCell
                col={col}
                value={rowValues[col.propertyName]}
                onChange={(v) => ctx.onEditValueChange(row.original.id, col.propertyName, v)}
              />
            );
          }
          return formatCellValue(getValue(), col);
        },
        enableSorting: true,
      };
    });

  const actionsColumn: ColumnDef<Record<string, any>, any> = {
    id: "actions",
    header: "",
    enableSorting: false,
    size: 64,
    cell: ({ row }: { row: { original: Record<string, any> } }) => {
      const isEditing = row.original.id in inlineEditRef.current.editingRows;

      return (
        <div className="flex items-center justify-end space-x-1">
          {isEditing ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelEdit(row.original.id);
              }}
              className="text-gray-500 hover:text-orange-600 transition-colors"
              title="Cancel edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-gray-500 hover:text-blue-600 transition-colors"
                title="Edit record"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row.original);
                }}
                className="text-gray-500 hover:text-red-600 transition-colors"
                title="Delete record"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      );
    },
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
  const sortedCategories = keys(grouped).sort();

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    editRecord: Record<string, any> | null;
  }>({ open: false, editRecord: null });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    record: Record<string, any> | null;
  }>({ open: false, record: null });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingRows, setEditingRows] = useState<Record<number, Record<string, any>>>({});
  const [savingRowIds, setSavingRowIds] = useState<Set<number>>(new Set());

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

  const modules = useMemo(() => modulesQuery.data ?? [], [modulesQuery.data]);
  const selectedModule = modules.find((m) => m.entityName === selectedEntity);
  const schemaColumns = useMemo(() => schemaQuery.data?.columns ?? [], [schemaQuery.data?.columns]);
  const schemaRelations = useMemo(
    () => schemaQuery.data?.relations ?? [],
    [schemaQuery.data?.relations],
  );
  const records = recordsQuery.data?.items ?? [];
  const totalRows = recordsQuery.data?.total ?? 0;

  useEffect(() => {
    if (initializedFromUrl || modules.length === 0) return;

    const entityParam = searchParams.get("entity");
    const searchParam = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("page-size");
    const sortByParam = searchParams.get("sort-by");
    const sortOrderParam = searchParams.get("sort-order");

    if (entityParam) {
      const resolved = fromKebab(entityParam, modules);
      if (resolved) {
        setSelectedEntity(resolved);
      }
    }

    if (searchParam) {
      setSearch(searchParam);
      setActiveSearch(searchParam);
    }

    if (pageParam) {
      const pageNum = Number(pageParam);
      if (!Number.isNaN(pageNum) && pageNum >= 1) {
        setPagination((prev) => ({ ...prev, pageIndex: pageNum - 1 }));
      }
    }

    if (pageSizeParam) {
      const size = Number(pageSizeParam);
      if (!Number.isNaN(size) && size > 0) {
        setPagination((prev) => ({ ...prev, pageSize: size }));
      }
    }

    if (sortByParam) {
      const colId = sortByParam.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
      setSorting([{ id: colId, desc: sortOrderParam === "desc" }]);
    }

    setInitializedFromUrl(true);
  }, [modules, searchParams, initializedFromUrl]);

  const updateUrl = useCallback(
    (
      entity: string | null,
      searchVal: string,
      page: number,
      pageSize: number,
      sort?: SortingState,
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      if (entity) {
        params.set("entity", toKebab(entity));
      } else {
        params.delete("entity");
      }
      if (searchVal) {
        params.set("search", searchVal);
      } else {
        params.delete("search");
      }
      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }
      if (pageSize !== 25) {
        params.set("page-size", String(pageSize));
      } else {
        params.delete("page-size");
      }
      if (sort && sort.length > 0) {
        params.set("sort-by", kebabCase(sort[0].id));
        if (sort[0].desc) {
          params.set("sort-order", "desc");
        } else {
          params.delete("sort-order");
        }
      } else {
        params.delete("sort-by");
        params.delete("sort-order");
      }

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleEntitySelect = (entityName: string) => {
    setEditingRows({});
    setSelectedEntity(entityName);
    setPagination({ pageIndex: 0, pageSize: 25 });
    setSorting([]);
    setSearch("");
    setActiveSearch("");
    updateUrl(entityName, "", 1, 25, []);
  };

  const handleSearch = () => {
    setActiveSearch(search);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    updateUrl(selectedEntity, search, 1, pagination.pageSize, sorting);
  };

  const handlePaginationChange = (
    updater: PaginationState | ((prev: PaginationState) => PaginationState),
  ) => {
    const next = isFunction(updater) ? updater(pagination) : updater;
    setPagination(next);
    updateUrl(selectedEntity, activeSearch, next.pageIndex + 1, next.pageSize, sorting);
  };

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = isFunction(updater) ? updater(sorting) : updater;
    setSorting(next);
    updateUrl(selectedEntity, activeSearch, pagination.pageIndex + 1, pagination.pageSize, next);
  };

  const handleDelete = (row: Record<string, any>) => {
    setEditingRows((prev) => {
      const { [row.id]: _, ...rest } = prev;
      return rest;
    });
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
        if (val !== null && isObject(val)) {
          const obj = val as Record<string, any>;
          flat[accessorKey] = obj.name ?? obj.code ?? obj.id ?? "";
        } else {
          flat[accessorKey] = val ?? "";
        }
      });
      return flat;
    });

    exportToExcel(flatData, exportColumns, selectedModule.displayName, selectedModule.displayName);
  };

  const relationPropertyNames = useMemo(
    () => new Set(schemaRelations.map((r) => r.propertyName)),
    [schemaRelations],
  );

  const editableColumns = useMemo(
    () =>
      schemaColumns.filter(
        (col) => !col.isPrimary && !col.isGenerated && !relationPropertyNames.has(col.propertyName),
      ),
    [schemaColumns, relationPropertyNames],
  );

  const dirtyRowCount = keys(editingRows).length;

  const handleStartEdit = (row: Record<string, any>) => {
    const values = editableColumns.reduce<Record<string, any>>(
      (acc, col) => ({
        ...acc,
        [col.propertyName]: initValueForEdit(row[col.propertyName], col),
      }),
      {},
    );
    setEditingRows((prev) => ({ ...prev, [row.id]: values }));
  };

  const handleEditValueChange = (rowId: number, field: string, value: any) => {
    setEditingRows((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [field]: value },
    }));
  };

  const handleCancelRow = (rowId: number) => {
    setEditingRows((prev) => {
      const { [rowId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleCancelAll = () => {
    setEditingRows({});
  };

  const buildPayload = (rowValues: Record<string, any>) =>
    editableColumns.reduce<Record<string, any>>(
      (acc, col) => ({
        ...acc,
        [col.propertyName]: coerceFormValue(rowValues[col.propertyName], col.type),
      }),
      {},
    );

  const handleSaveAll = async () => {
    const rowIds = keys(editingRows).map(Number);
    if (rowIds.length === 0) return;

    setSavingRowIds(new Set(rowIds));
    const results = await Promise.allSettled(
      rowIds.map((rowId) =>
        updateMutation.mutateAsync({ id: rowId, data: buildPayload(editingRows[rowId]) }),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      showToast(`${succeeded} record(s) updated successfully`, "success");
      setEditingRows({});
    } else {
      showToast(`${succeeded} saved, ${failed} failed`, "error");
      const failedRowIds = new Set(rowIds.filter((_, i) => results[i].status === "rejected"));
      setEditingRows((prev) =>
        keys(prev)
          .filter((id) => failedRowIds.has(Number(id)))
          .reduce<Record<number, Record<string, any>>>(
            (acc, id) => ({ ...acc, [id]: prev[Number(id)] }),
            {},
          ),
      );
    }
    setSavingRowIds(new Set());
  };

  const inlineEditRef = useRef<InlineEditContext>({
    editingRows: {},
    onEditValueChange: handleEditValueChange,
  });

  inlineEditRef.current = {
    editingRows,
    onEditValueChange: handleEditValueChange,
  };

  useEffect(() => {
    if (dirtyRowCount === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancelAll();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dirtyRowCount]);

  const handleRowDoubleClick = (row: Record<string, any>) => {
    if (row.id in editingRows) return;
    handleStartEdit(row);
  };

  const editingRowClassName = (row: Record<string, any>) =>
    row.id in editingRows ? "bg-blue-50 hover:bg-blue-100" : "";

  const columns = useMemo(
    () =>
      buildColumns(
        schemaColumns,
        relationPropertyNames,
        handleStartEdit,
        handleCancelRow,
        handleDelete,
        inlineEditRef,
      ),
    [schemaColumns, relationPropertyNames],
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

        <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-12rem)]">
          {selectedEntity && selectedModule ? (
            <>
              <div className="flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedModule.displayName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedModule.tableName} -- {totalRows} records
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0 mt-4">
                <DataTableToolbar
                  search={search}
                  onSearchChange={setSearch}
                  onSearch={handleSearch}
                  searchPlaceholder={`Search ${selectedModule.displayName}...`}
                  onExport={records.length > 0 ? handleExport : undefined}
                  extraActions={
                    <>
                      {dirtyRowCount > 0 && (
                        <>
                          <button
                            onClick={handleSaveAll}
                            disabled={savingRowIds.size > 0}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            {savingRowIds.size > 0
                              ? "Saving..."
                              : `Save ${dirtyRowCount} Change${dirtyRowCount > 1 ? "s" : ""}`}
                          </button>
                          <button
                            onClick={handleCancelAll}
                            disabled={savingRowIds.size > 0}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Discard All
                          </button>
                        </>
                      )}
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
                    </>
                  }
                />
              </div>

              <div className="flex-1 min-h-0 mt-4">
                <DataTable
                  columns={columns}
                  data={records}
                  totalRows={totalRows}
                  pagination={pagination}
                  onPaginationChange={handlePaginationChange}
                  sorting={sorting}
                  onSortingChange={handleSortingChange}
                  isLoading={recordsQuery.isLoading || schemaQuery.isLoading}
                  emptyMessage={`No records in ${selectedModule.displayName}`}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onRowDoubleClick={handleRowDoubleClick}
                  rowClassName={editingRowClassName}
                  fitToScreen
                />
              </div>
            </>
          ) : (
            <div className="bg-white shadow rounded-lg flex items-center justify-center flex-1">
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
