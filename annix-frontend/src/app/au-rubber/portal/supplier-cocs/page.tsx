"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CocProcessingStatus,
  type RubberSupplierCocDto,
  type SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";
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

type SortColumn =
  | "cocNumber"
  | "supplierCompanyName"
  | "cocType"
  | "processingStatus"
  | "createdAt";

export default function SupplierCocsPage() {
  const { showToast } = useToast();
  const [cocs, setCocs] = useState<RubberSupplierCocDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<SupplierCocType | "">("");
  const [filterStatus, setFilterStatus] = useState<CocProcessingStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<SupplierCocType>("COMPOUNDER");
  const [uploadSupplierId, setUploadSupplierId] = useState<number | null>(null);
  const [uploadCocNumber, setUploadCocNumber] = useState("");
  const [uploadCompoundCode, setUploadCompoundCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cocsData, companiesData] = await Promise.all([
        auRubberApiClient.supplierCocs({
          cocType: filterType || undefined,
          processingStatus: filterStatus || undefined,
        }),
        auRubberApiClient.companies(),
      ]);
      setCocs(Array.isArray(cocsData) ? cocsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterStatus]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortCocs = (cocsToSort: RubberSupplierCocDto[]): RubberSupplierCocDto[] => {
    return [...cocsToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "cocNumber") {
        return direction * (a.cocNumber || "").localeCompare(b.cocNumber || "");
      }
      if (sortColumn === "supplierCompanyName") {
        return direction * (a.supplierCompanyName || "").localeCompare(b.supplierCompanyName || "");
      }
      if (sortColumn === "cocType") {
        return direction * a.cocType.localeCompare(b.cocType);
      }
      if (sortColumn === "processingStatus") {
        return direction * a.processingStatus.localeCompare(b.processingStatus);
      }
      if (sortColumn === "createdAt") {
        return direction * a.createdAt.localeCompare(b.createdAt);
      }
      return 0;
    });
  };

  const filteredCocs = sortCocs(
    cocs.filter((coc) => {
      const matchesSearch =
        searchQuery === "" ||
        coc.cocNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.supplierCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.compoundCode?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }),
  );

  const paginatedCocs = filteredCocs.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterType, filterStatus]);

  const handleUpload = async () => {
    if (!uploadSupplierId) {
      showToast("Please select a supplier", "error");
      return;
    }
    try {
      setIsUploading(true);
      await auRubberApiClient.uploadSupplierCoc({
        cocType: uploadType,
        supplierCompanyId: uploadSupplierId,
        cocNumber: uploadCocNumber || undefined,
        compoundCode: uploadCompoundCode || undefined,
      });
      showToast("Supplier CoC created", "success");
      setShowUploadModal(false);
      setUploadSupplierId(null);
      setUploadCocNumber("");
      setUploadCompoundCode("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create CoC", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const statusBadge = (status: CocProcessingStatus) => {
    const colors: Record<CocProcessingStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      EXTRACTED: "bg-blue-100 text-blue-800",
      NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
    };
    const labels: Record<CocProcessingStatus, string> = {
      PENDING: "Pending",
      EXTRACTED: "Extracted",
      NEEDS_REVIEW: "Needs Review",
      APPROVED: "Approved",
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const typeBadge = (type: SupplierCocType) => {
    const colors: Record<SupplierCocType, string> = {
      COMPOUNDER: "bg-purple-100 text-purple-800",
      CALENDARER: "bg-indigo-100 text-indigo-800",
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[type]}`}
      >
        {type}
      </span>
    );
  };

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
      <Breadcrumb items={[{ label: "Supplier CoCs" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Certificates of Conformance</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and track supplier CoC documents from compounder and calendarer
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add CoC
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="CoC number, supplier, compound"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as SupplierCocType | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Types</option>
              <option value="COMPOUNDER">Compounder</option>
              <option value="CALENDARER">Calendarer</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CocProcessingStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="EXTRACTED">Extracted</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading supplier CoCs..." />
        ) : filteredCocs.length === 0 ? (
          <TableEmptyState
            icon={TableIcons.document}
            title="No supplier CoCs found"
            subtitle={
              searchQuery || filterType || filterStatus
                ? "Try adjusting your filters"
                : "Get started by uploading a supplier CoC"
            }
            action={
              !searchQuery && !filterType && !filterStatus
                ? { label: "Add CoC", onClick: () => setShowUploadModal(true) }
                : undefined
            }
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("cocNumber")}
                >
                  CoC Number
                  <SortIcon active={sortColumn === "cocNumber"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("supplierCompanyName")}
                >
                  Supplier
                  <SortIcon
                    active={sortColumn === "supplierCompanyName"}
                    direction={sortDirection}
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("cocType")}
                >
                  Type
                  <SortIcon active={sortColumn === "cocType"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Compound
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("processingStatus")}
                >
                  Status
                  <SortIcon active={sortColumn === "processingStatus"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                  <SortIcon active={sortColumn === "createdAt"} direction={sortDirection} />
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCocs.map((coc) => (
                <tr key={coc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/supplier-cocs/${coc.id}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {coc.cocNumber || `COC-${coc.id}`}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coc.supplierCompanyName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{typeBadge(coc.cocType)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coc.compoundCode || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {statusBadge(coc.processingStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(coc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/au-rubber/portal/supplier-cocs/${coc.id}`}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCocs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="CoCs"
          onPageChange={setCurrentPage}
        />
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowUploadModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Supplier CoC</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as SupplierCocType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="COMPOUNDER">Compounder (S&N Rubber)</option>
                    <option value="CALENDARER">Calendarer (Impilo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <select
                    value={uploadSupplierId ?? ""}
                    onChange={(e) =>
                      setUploadSupplierId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="">Select supplier</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CoC Number</label>
                  <input
                    type="text"
                    value={uploadCocNumber}
                    onChange={(e) => setUploadCocNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compound Code</label>
                  <input
                    type="text"
                    value={uploadCompoundCode}
                    onChange={(e) => setUploadCompoundCode(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadSupplierId}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isUploading ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
