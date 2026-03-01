"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CreateOpeningStockDto,
  type ImportOpeningStockResultDto,
  type ImportOpeningStockRowDto,
  type RollStockStatus,
  type RubberRollStockDto,
  type StockLocationDto,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto, RubberProductCodingDto } from "@/app/lib/api/rubberPortalApi";
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

type SortColumn = "rollNumber" | "compoundName" | "weightKg" | "status" | "createdAt";

export default function RollStockPage() {
  const { showToast } = useToast();
  const [rolls, setRolls] = useState<RubberRollStockDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<RollStockStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveRollId, setReserveRollId] = useState<number | null>(null);
  const [reserveCustomerId, setReserveCustomerId] = useState<number | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);
  const [scrapRollId, setScrapRollId] = useState<number | null>(null);
  const [scrapReason, setScrapReason] = useState("");
  const [isScrapping, setIsScrapping] = useState(false);
  const [compoundCodings, setCompoundCodings] = useState<RubberProductCodingDto[]>([]);
  const [locations, setLocations] = useState<StockLocationDto[]>([]);
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [openingStockTab, setOpeningStockTab] = useState<"single" | "bulk">("single");
  const [openingStockForm, setOpeningStockForm] = useState<CreateOpeningStockDto>({
    rollNumber: "",
    compoundCodingId: 0,
    weightKg: 0,
    costZar: null,
    priceZar: null,
    locationId: null,
    productionDate: null,
    notes: null,
  });
  const [isSubmittingOpeningStock, setIsSubmittingOpeningStock] = useState(false);
  const [csvData, setCsvData] = useState<ImportOpeningStockRowDto[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportOpeningStockResultDto | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rollsData, companiesData, codingsData, locationsData] = await Promise.all([
        auRubberApiClient.rollStock({
          status: filterStatus || undefined,
        }),
        auRubberApiClient.companies(),
        auRubberApiClient.productCodings(),
        auRubberApiClient.stockLocations(),
      ]);
      setRolls(Array.isArray(rollsData) ? rollsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      const compounds = (Array.isArray(codingsData) ? codingsData : []).filter(
        (c) => c.codingType === "COMPOUND",
      );
      setCompoundCodings(compounds);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortRolls = (rollsToSort: RubberRollStockDto[]): RubberRollStockDto[] => {
    return [...rollsToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "rollNumber") {
        return direction * a.rollNumber.localeCompare(b.rollNumber);
      }
      if (sortColumn === "compoundName") {
        return direction * (a.compoundName || "").localeCompare(b.compoundName || "");
      }
      if (sortColumn === "weightKg") {
        return direction * (a.weightKg - b.weightKg);
      }
      if (sortColumn === "status") {
        return direction * a.status.localeCompare(b.status);
      }
      if (sortColumn === "createdAt") {
        return direction * a.createdAt.localeCompare(b.createdAt);
      }
      return 0;
    });
  };

  const filteredRolls = sortRolls(
    rolls.filter((roll) => {
      const matchesSearch =
        searchQuery === "" ||
        roll.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        roll.compoundName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        roll.compoundCode?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }),
  );

  const paginatedRolls = filteredRolls.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus]);

  const handleReserve = async () => {
    if (!reserveRollId || !reserveCustomerId) {
      showToast("Please select a customer", "error");
      return;
    }
    try {
      setIsReserving(true);
      await auRubberApiClient.reserveRoll(reserveRollId, reserveCustomerId);
      showToast("Roll reserved", "success");
      setShowReserveModal(false);
      setReserveRollId(null);
      setReserveCustomerId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reserve roll", "error");
    } finally {
      setIsReserving(false);
    }
  };

  const handleUnreserve = async (rollId: number) => {
    try {
      await auRubberApiClient.unreserveRoll(rollId);
      showToast("Reservation cancelled", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to unreserve roll", "error");
    }
  };

  const handleScrap = async () => {
    if (!scrapRollId) return;
    try {
      setIsScrapping(true);
      await auRubberApiClient.scrapRoll(scrapRollId, scrapReason || undefined);
      showToast("Roll marked as scrapped", "success");
      setShowScrapModal(false);
      setScrapRollId(null);
      setScrapReason("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to scrap roll", "error");
    } finally {
      setIsScrapping(false);
    }
  };

  const resetOpeningStockForm = () => {
    setOpeningStockForm({
      rollNumber: "",
      compoundCodingId: 0,
      weightKg: 0,
      costZar: null,
      priceZar: null,
      locationId: null,
      productionDate: null,
      notes: null,
    });
    setCsvData([]);
    setCsvFileName("");
    setImportResult(null);
    setOpeningStockTab("single");
  };

  const handleCreateOpeningStock = async () => {
    if (
      !openingStockForm.rollNumber ||
      !openingStockForm.compoundCodingId ||
      !openingStockForm.weightKg
    ) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    try {
      setIsSubmittingOpeningStock(true);
      await auRubberApiClient.createOpeningStock(openingStockForm);
      showToast("Opening stock created successfully", "success");
      setShowOpeningStockModal(false);
      resetOpeningStockForm();
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create opening stock", "error");
    } finally {
      setIsSubmittingOpeningStock(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows: ImportOpeningStockRowDto[] = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const rowData: ImportOpeningStockRowDto = {
          rollNumber: values[headers.indexOf("roll_number")] || "",
          compoundCode: values[headers.indexOf("compound_code")] || "",
          weightKg: Number(values[headers.indexOf("weight_kg")]) || 0,
          costZar: values[headers.indexOf("cost_zar")]
            ? Number(values[headers.indexOf("cost_zar")])
            : null,
          priceZar: values[headers.indexOf("price_zar")]
            ? Number(values[headers.indexOf("price_zar")])
            : null,
          location: values[headers.indexOf("location")] || null,
          productionDate: values[headers.indexOf("production_date")] || null,
        };
        return rowData;
      });
      setCsvData(rows.filter((r) => r.rollNumber && r.compoundCode));
    };
    reader.readAsText(file);
  };

  const handleImportOpeningStock = async () => {
    if (csvData.length === 0) {
      showToast("No valid data to import", "error");
      return;
    }
    try {
      setIsImporting(true);
      const result = await auRubberApiClient.importOpeningStock(csvData);
      setImportResult(result);
      if (result.errors.length === 0) {
        showToast(`Successfully imported ${result.created} rolls`, "success");
        setShowOpeningStockModal(false);
        resetOpeningStockForm();
        fetchData();
      } else {
        showToast(`Imported ${result.created} of ${result.totalRows} rolls with errors`, "warning");
        fetchData();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to import opening stock", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const statusBadge = (status: RollStockStatus) => {
    const colors: Record<RollStockStatus, string> = {
      IN_STOCK: "bg-green-100 text-green-800",
      RESERVED: "bg-yellow-100 text-yellow-800",
      SOLD: "bg-blue-100 text-blue-800",
      SCRAPPED: "bg-red-100 text-red-800",
    };
    const labels: Record<RollStockStatus, string> = {
      IN_STOCK: "In Stock",
      RESERVED: "Reserved",
      SOLD: "Sold",
      SCRAPPED: "Scrapped",
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const inStockCount = rolls.filter((r) => r.status === "IN_STOCK").length;
  const reservedCount = rolls.filter((r) => r.status === "RESERVED").length;
  const soldCount = rolls.filter((r) => r.status === "SOLD").length;

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
      <Breadcrumb items={[{ label: "Roll Stock" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roll Stock Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage rubber roll inventory with full traceability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOpeningStockModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Opening Stock
          </button>
          <Link
            href="/au-rubber/portal/au-cocs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Generate AU CoC
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">In Stock</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{inStockCount}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Reserved</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">{reservedCount}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Sold</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{soldCount}</div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Roll number, compound"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RollStockStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="RESERVED">Reserved</option>
              <option value="SOLD">Sold</option>
              <option value="SCRAPPED">Scrapped</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading roll stock..." />
        ) : filteredRolls.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.document />}
            title="No rolls found"
            subtitle={
              searchQuery || filterStatus
                ? "Try adjusting your filters"
                : "Rolls are created from delivery notes"
            }
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("rollNumber")}
                >
                  Roll Number
                  <SortIcon active={sortColumn === "rollNumber"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("compoundName")}
                >
                  Compound
                  <SortIcon active={sortColumn === "compoundName"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("weightKg")}
                >
                  Weight (kg)
                  <SortIcon active={sortColumn === "weightKg"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Dimensions
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon active={sortColumn === "status"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRolls.map((roll) => (
                <tr key={roll.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/roll-stock/${roll.id}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {roll.rollNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {roll.compoundName || "-"}
                    {roll.compoundCode && (
                      <span className="ml-1 text-xs text-gray-500">({roll.compoundCode})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {roll.weightKg.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {roll.widthMm && roll.thicknessMm && roll.lengthM
                      ? `${roll.widthMm}mm x ${roll.thicknessMm}mm x ${roll.lengthM}m`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{statusBadge(roll.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {roll.soldToCompanyName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/au-rubber/portal/roll-stock/${roll.id}`}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      View
                    </Link>
                    {roll.status === "IN_STOCK" && (
                      <>
                        <button
                          onClick={() => {
                            setReserveRollId(roll.id);
                            setShowReserveModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Reserve
                        </button>
                        <button
                          onClick={() => {
                            setScrapRollId(roll.id);
                            setShowScrapModal(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Scrap
                        </button>
                      </>
                    )}
                    {roll.status === "RESERVED" && (
                      <button
                        onClick={() => handleUnreserve(roll.id)}
                        className="text-orange-600 hover:text-orange-800"
                      >
                        Unreserve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredRolls.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="rolls"
          onPageChange={setCurrentPage}
        />
      </div>

      {showReserveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowReserveModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reserve Roll</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    value={reserveCustomerId ?? ""}
                    onChange={(e) =>
                      setReserveCustomerId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="">Select customer</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowReserveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReserve}
                  disabled={isReserving || !reserveCustomerId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isReserving ? "Reserving..." : "Reserve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScrapModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowScrapModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Scrap Roll</h3>
              <p className="text-sm text-gray-500 mb-4">
                This action cannot be undone. The roll will be marked as scrapped.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reason (optional)
                  </label>
                  <textarea
                    value={scrapReason}
                    onChange={(e) => setScrapReason(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    rows={2}
                    placeholder="Reason for scrapping"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowScrapModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScrap}
                  disabled={isScrapping}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isScrapping ? "Scrapping..." : "Scrap Roll"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOpeningStockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowOpeningStockModal(false);
                resetOpeningStockForm();
              }}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Opening Stock</h3>

              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setOpeningStockTab("single")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      openingStockTab === "single"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Single Entry
                  </button>
                  <button
                    onClick={() => setOpeningStockTab("bulk")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      openingStockTab === "bulk"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Bulk Import
                  </button>
                </nav>
              </div>

              {openingStockTab === "single" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Roll Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={openingStockForm.rollNumber}
                        onChange={(e) =>
                          setOpeningStockForm({ ...openingStockForm, rollNumber: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="e.g., ROLL-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Compound <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={openingStockForm.compoundCodingId}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            compoundCodingId: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      >
                        <option value={0}>Select compound</option>
                        {compoundCodings.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.weightKg || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            weightKg: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="125.50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cost (ZAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.costZar ?? ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            costZar: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="1500.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Selling Price (ZAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.priceZar ?? ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            priceZar: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="2200.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <select
                        value={openingStockForm.locationId ?? ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            locationId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      >
                        <option value="">Select location</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Production Date
                      </label>
                      <input
                        type="date"
                        value={openingStockForm.productionDate ?? ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            productionDate: e.target.value || null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={openingStockForm.notes ?? ""}
                      onChange={(e) =>
                        setOpeningStockForm({
                          ...openingStockForm,
                          notes: e.target.value || null,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      rows={2}
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowOpeningStockModal(false);
                        resetOpeningStockForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateOpeningStock}
                      disabled={isSubmittingOpeningStock}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isSubmittingOpeningStock ? "Creating..." : "Create Roll"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        {csvFileName || "Click to upload CSV file"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Columns: roll_number, compound_code, weight_kg, cost_zar, price_zar,
                        location, production_date
                      </p>
                    </label>
                  </div>

                  {csvData.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        Preview ({csvData.length} rows)
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Roll Number
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Compound
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Weight (kg)
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Cost
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Price
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.slice(0, 10).map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.rollNumber}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.compoundCode}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.weightKg}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.costZar ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.priceZar ?? "-"}
                                </td>
                              </tr>
                            ))}
                            {csvData.length > 10 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-3 py-2 text-sm text-gray-500 text-center"
                                >
                                  ...and {csvData.length - 10} more rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importResult && importResult.errors.length > 0 && (
                    <div className="border border-red-200 rounded-lg bg-red-50 p-4">
                      <h4 className="text-sm font-medium text-red-800 mb-2">
                        Import Errors ({importResult.errors.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto text-sm text-red-700">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx}>
                            Row {err.row} ({err.rollNumber}): {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowOpeningStockModal(false);
                        resetOpeningStockForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportOpeningStock}
                      disabled={isImporting || csvData.length === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isImporting ? "Importing..." : `Import ${csvData.length} Rolls`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
