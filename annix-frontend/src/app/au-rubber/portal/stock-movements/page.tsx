"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CompoundMovementReferenceType,
  type CompoundMovementType,
  type RubberCompoundMovementDto,
  type RubberCompoundStockDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { Breadcrumb } from "../../components/Breadcrumb";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn = "compoundName" | "movementType" | "quantityKg" | "referenceType" | "createdAt";

const typeColor = (type: CompoundMovementType) => {
  const colors: Record<CompoundMovementType, string> = {
    IN: "bg-green-100 text-green-800",
    OUT: "bg-red-100 text-red-800",
    ADJUSTMENT: "bg-blue-100 text-blue-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
};

const typeLabel = (type: CompoundMovementType) => {
  const labels: Record<CompoundMovementType, string> = {
    IN: "In",
    OUT: "Out",
    ADJUSTMENT: "Adjustment",
  };
  return labels[type] || type;
};

const referenceLabel = (type: CompoundMovementReferenceType) => {
  const labels: Record<CompoundMovementReferenceType, string> = {
    PURCHASE: "Purchase Order",
    PRODUCTION: "Production",
    MANUAL: "Manual Receipt",
    STOCK_TAKE: "Stock Take",
  };
  return labels[type] || type;
};

export default function StockMovementsPage() {
  const { showToast } = useToast();
  const [movements, setMovements] = useState<RubberCompoundMovementDto[]>([]);
  const [stocks, setStocks] = useState<RubberCompoundStockDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [compoundFilter, setCompoundFilter] = useState<number | "">("");
  const [typeFilter, setTypeFilter] = useState<CompoundMovementType | "">("");
  const [referenceFilter, setReferenceFilter] = useState<CompoundMovementReferenceType | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [movementsData, stocksData] = await Promise.all([
        auRubberApiClient.compoundMovements({
          compoundStockId: compoundFilter || undefined,
          movementType: typeFilter || undefined,
          referenceType: referenceFilter || undefined,
        }),
        auRubberApiClient.compoundStocks(),
      ]);
      setMovements(Array.isArray(movementsData) ? movementsData : []);
      setStocks(Array.isArray(stocksData) ? stocksData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [compoundFilter, typeFilter, referenceFilter]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortMovements = (items: RubberCompoundMovementDto[]): RubberCompoundMovementDto[] => {
    return [...items].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "compoundName")
        return direction * (a.compoundName || "").localeCompare(b.compoundName || "");
      if (sortColumn === "movementType")
        return direction * a.movementType.localeCompare(b.movementType);
      if (sortColumn === "quantityKg") return direction * (a.quantityKg - b.quantityKg);
      if (sortColumn === "referenceType")
        return direction * a.referenceType.localeCompare(b.referenceType);
      if (sortColumn === "createdAt") return direction * a.createdAt.localeCompare(b.createdAt);
      return 0;
    });
  };

  const paginatedMovements = sortMovements(movements).slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [compoundFilter, typeFilter, referenceFilter]);

  const clearFilters = () => {
    setCompoundFilter("");
    setTypeFilter("");
    setReferenceFilter("");
  };

  const hasFilters = compoundFilter || typeFilter || referenceFilter;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Movement History" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movement History</h1>
        <p className="mt-1 text-sm text-gray-600">Track all compound stock movements</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Compound:</label>
            <select
              value={compoundFilter}
              onChange={(e) => setCompoundFilter(e.target.value ? Number(e.target.value) : "")}
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Compounds</option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.compoundName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CompoundMovementType | "")}
              className="block w-36 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Types</option>
              <option value="IN">In</option>
              <option value="OUT">Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Reference:</label>
            <select
              value={referenceFilter}
              onChange={(e) =>
                setReferenceFilter(e.target.value as CompoundMovementReferenceType | "")
              }
              className="block w-44 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All References</option>
              <option value="PURCHASE">Purchase Order</option>
              <option value="PRODUCTION">Production</option>
              <option value="MANUAL">Manual Receipt</option>
              <option value="STOCK_TAKE">Stock Take</option>
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-gray-600 hover:text-gray-900">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading movements..." />
        ) : movements.length === 0 ? (
          <TableEmptyState
            icon={TableIcons.document}
            title="No movements found"
            subtitle={hasFilters ? "Try adjusting your filters" : "No stock movements recorded yet"}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("createdAt")}
                >
                  Date
                  <SortIcon active={sortColumn === "createdAt"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("compoundName")}
                >
                  Compound
                  <SortIcon active={sortColumn === "compoundName"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("movementType")}
                >
                  Type
                  <SortIcon active={sortColumn === "movementType"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("quantityKg")}
                >
                  Quantity
                  <SortIcon active={sortColumn === "quantityKg"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("referenceType")}
                >
                  Reference
                  <SortIcon active={sortColumn === "referenceType"} direction={sortDirection} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedMovements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(m.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {m.compoundName || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColor(m.movementType)}`}
                    >
                      {typeLabel(m.movementType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span
                      className={
                        m.movementType === "OUT"
                          ? "text-red-600"
                          : m.movementType === "IN"
                            ? "text-green-600"
                            : "text-blue-600"
                      }
                    >
                      {m.movementType === "OUT" ? "-" : m.movementType === "IN" ? "+" : ""}
                      {m.quantityKg.toFixed(2)} kg
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {referenceLabel(m.referenceType)}
                    {m.referenceId && (
                      <span className="ml-1 text-xs text-gray-400">#{m.referenceId}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {m.batchNumber || "-"}
                  </td>
                  <td
                    className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate"
                    title={m.notes || ""}
                  >
                    {m.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={movements.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="movements"
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
