"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { DataTablePagination } from "./DataTablePagination";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  totalRows: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  isLoading?: boolean;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  emptyMessage?: string;
  pageSizeOptions?: number[];
  fitToScreen?: boolean;
}

function LoadingSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {Array.from({ length: 5 }, (_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: columnCount }, (_, colIdx) => (
            <td key={colIdx} className="px-6 py-4 whitespace-nowrap">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function DataTable<TData>({
  columns,
  data,
  totalRows,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  isLoading = false,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  emptyMessage = "No data found",
  pageSizeOptions,
  fitToScreen = false,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
    state: {
      pagination,
      sorting: sorting ?? [],
      rowSelection: rowSelection ?? {},
    },
    onPaginationChange,
    onSortingChange,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection,
  });

  const totalPages = Math.ceil(totalRows / pagination.pageSize);

  return (
    <div
      className={`bg-white shadow rounded-lg overflow-hidden ${fitToScreen ? "h-full flex flex-col" : ""}`}
    >
      <div className={`overflow-x-auto ${fitToScreen ? "flex-1 overflow-y-auto" : ""}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`bg-gray-50 ${fitToScreen ? "sticky top-0 z-10" : ""}`}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        canSort ? "cursor-pointer select-none hover:text-gray-700" : ""
                      }`}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center space-x-1">
                        <span>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {canSort && (
                          <span className="ml-1">
                            {sorted === "asc" ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.293 9.707l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 7.414l-3.293 3.293a1 1 0 01-1.414-1.414z" />
                              </svg>
                            ) : sorted === "desc" ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M14.707 10.293l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 12.586l3.293-3.293a1 1 0 111.414 1.414z" />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4 text-gray-300"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M5.293 7.293l4-4a1 1 0 011.414 0l4 4M14.707 12.707l-4 4a1 1 0 01-1.414 0l-4-4" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          {isLoading ? (
            <LoadingSkeleton columnCount={columns.length} />
          ) : data.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  onDoubleClick={() => onRowDoubleClick?.(row.original)}
                  className={`${onRowClick || onRowDoubleClick ? "cursor-pointer" : ""} ${rowClassName?.(row.original) || "hover:bg-gray-50"} transition-colors`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {totalRows > 0 && (
        <DataTablePagination
          className={fitToScreen ? "flex-shrink-0" : ""}
          page={pagination.pageIndex + 1}
          totalPages={totalPages}
          total={totalRows}
          pageSize={pagination.pageSize}
          onPageChange={(p) =>
            onPaginationChange({ pageIndex: p - 1, pageSize: pagination.pageSize })
          }
          onPageSizeChange={
            pageSizeOptions
              ? (size) => onPaginationChange({ pageIndex: 0, pageSize: size })
              : undefined
          }
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
