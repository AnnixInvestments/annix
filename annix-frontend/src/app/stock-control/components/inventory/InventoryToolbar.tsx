import type { RefObject } from "react";
import Link from "next/link";
import type { StockItem } from "@/app/lib/api/stockControlApi";
import { HelpTooltip } from "../HelpTooltip";
import { formatZAR } from "../../lib/currency";
import type { LocationGroup } from "../../lib/useInventoryPageState";

interface InventoryToolbarProps {
  viewMode: string;
  groupedData: LocationGroup[];
  allItems: StockItem[];
  isPrintingLabels: boolean;
  showPrintDropdown: boolean;
  selectedIdsSize: number;
  printDropdownRef: RefObject<HTMLDivElement | null>;
  onPrintAll: () => void;
  onTogglePrintDropdown: () => void;
  onPrintStockList: (mode: "all" | "selected") => void;
  onOpenCreateModal: () => void;
}

export function InventoryToolbar({
  viewMode,
  groupedData,
  allItems,
  isPrintingLabels,
  showPrintDropdown,
  selectedIdsSize,
  printDropdownRef,
  onPrintAll,
  onTogglePrintDropdown,
  onPrintStockList,
  onOpenCreateModal,
}: InventoryToolbarProps) {
  const sohValue =
    viewMode === "grouped" || viewMode === "cards"
      ? groupedData.reduce(
          (total, group) =>
            total + group.items.reduce((sum, i) => sum + i.costPerUnit * i.quantity, 0),
          0,
        )
      : allItems.reduce((sum, i) => sum + i.costPerUnit * i.quantity, 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-1 text-sm text-gray-600">Manage stock items and quantities</p>
        <p className="mt-1 text-lg font-semibold text-gray-800">
          Total SOH <HelpTooltip term="SOH" /> Value: {formatZAR(sohValue)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={onPrintAll}
          disabled={isPrintingLabels}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          {isPrintingLabels ? "Printing..." : "Print All Labels"}
        </button>
        <div className="relative" ref={printDropdownRef}>
          <button
            onClick={onTogglePrintDropdown}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Print Stock List
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showPrintDropdown && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                <button
                  onClick={() => onPrintStockList("all")}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Print Full List
                </button>
                <button
                  onClick={() => onPrintStockList("selected")}
                  disabled={selectedIdsSize === 0}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Print Selected ({selectedIdsSize})
                </button>
              </div>
            </div>
          )}
        </div>
        <Link
          href="/stock-control/portal/inventory/import"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import
        </Link>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Item
        </button>
      </div>
    </div>
  );
}
