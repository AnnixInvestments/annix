"use client";

import { FileText, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type DeliveryNoteStatus,
  type DeliveryNoteType,
  type RubberDeliveryNoteDto,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import { FileDropZone } from "../../components/FileDropZone";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn =
  | "deliveryNoteNumber"
  | "supplierCompanyName"
  | "deliveryNoteType"
  | "status"
  | "deliveryDate";

export default function DeliveryNotesPage() {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<RubberDeliveryNoteDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<DeliveryNoteType | "">("");
  const [filterStatus, setFilterStatus] = useState<DeliveryNoteStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("deliveryDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<DeliveryNoteType>("COMPOUND");
  const [uploadSupplierId, setUploadSupplierId] = useState<number | null>(null);
  const [uploadDnNumber, setUploadDnNumber] = useState("");
  const [uploadDeliveryDate, setUploadDeliveryDate] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [notesData, companiesData] = await Promise.all([
        auRubberApiClient.deliveryNotes({
          deliveryNoteType: filterType || undefined,
          status: filterStatus || undefined,
        }),
        auRubberApiClient.companies(),
      ]);
      setNotes(Array.isArray(notesData) ? notesData : []);
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

  const sortNotes = (notesToSort: RubberDeliveryNoteDto[]): RubberDeliveryNoteDto[] => {
    return [...notesToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "deliveryNoteNumber") {
        return direction * (a.deliveryNoteNumber || "").localeCompare(b.deliveryNoteNumber || "");
      }
      if (sortColumn === "supplierCompanyName") {
        return direction * (a.supplierCompanyName || "").localeCompare(b.supplierCompanyName || "");
      }
      if (sortColumn === "deliveryNoteType") {
        return direction * a.deliveryNoteType.localeCompare(b.deliveryNoteType);
      }
      if (sortColumn === "status") {
        return direction * a.status.localeCompare(b.status);
      }
      if (sortColumn === "deliveryDate") {
        return direction * (a.deliveryDate || "").localeCompare(b.deliveryDate || "");
      }
      return 0;
    });
  };

  const filteredNotes = sortNotes(
    notes.filter((note) => {
      const matchesSearch =
        searchQuery === "" ||
        note.deliveryNoteNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.supplierCompanyName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }),
  );

  const paginatedNotes = filteredNotes.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterType, filterStatus]);

  const handleFilesSelected = (files: File[]) => {
    setUploadFiles((prev) => [...prev, ...files]);
    if (!showUploadModal) {
      setShowUploadModal(true);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!uploadSupplierId) {
      showToast("Please select a supplier", "error");
      return;
    }
    try {
      setIsUploading(true);
      if (uploadFiles.length > 0) {
        await auRubberApiClient.uploadDeliveryNoteWithFiles(uploadFiles, {
          deliveryNoteType: uploadType,
          supplierCompanyId: uploadSupplierId,
          deliveryNoteNumber: uploadDnNumber || undefined,
          deliveryDate: uploadDeliveryDate || undefined,
        });
        showToast(
          `${uploadFiles.length} delivery note${uploadFiles.length > 1 ? "s" : ""} uploaded`,
          "success",
        );
      } else {
        await auRubberApiClient.uploadDeliveryNote({
          deliveryNoteType: uploadType,
          supplierCompanyId: uploadSupplierId,
          deliveryNoteNumber: uploadDnNumber || undefined,
          deliveryDate: uploadDeliveryDate || undefined,
        });
        showToast("Delivery note created", "success");
      }
      setShowUploadModal(false);
      setUploadSupplierId(null);
      setUploadDnNumber("");
      setUploadDeliveryDate("");
      setUploadFiles([]);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create delivery note", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const statusBadge = (status: DeliveryNoteStatus) => {
    const colors: Record<DeliveryNoteStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      LINKED: "bg-blue-100 text-blue-800",
      STOCK_CREATED: "bg-green-100 text-green-800",
    };
    const labels: Record<DeliveryNoteStatus, string> = {
      PENDING: "Pending",
      LINKED: "Linked",
      STOCK_CREATED: "Stock Created",
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const typeBadge = (type: DeliveryNoteType) => {
    const colors: Record<DeliveryNoteType, string> = {
      COMPOUND: "bg-orange-100 text-orange-800",
      ROLL: "bg-teal-100 text-teal-800",
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
      <Breadcrumb items={[{ label: "Delivery Notes" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Notes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track compound and roll deliveries from suppliers
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Delivery Note
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
              placeholder="DN number, supplier"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DeliveryNoteType | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Types</option>
              <option value="COMPOUND">Compound</option>
              <option value="ROLL">Roll</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DeliveryNoteStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="LINKED">Linked</option>
              <option value="STOCK_CREATED">Stock Created</option>
            </select>
          </div>
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        className="bg-white shadow rounded-lg overflow-hidden border-2 border-dashed"
      >
        {isLoading ? (
          <TableLoadingState message="Loading delivery notes..." />
        ) : filteredNotes.length === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <TableIcons.document className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No delivery notes found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterType || filterStatus
                  ? "Try adjusting your filters"
                  : "Drag & drop PDF files here or click to upload"}
              </p>
              {!searchQuery && !filterType && !filterStatus && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
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
                  Add Delivery Note
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("deliveryNoteNumber")}
                >
                  DN Number
                  <SortIcon
                    active={sortColumn === "deliveryNoteNumber"}
                    direction={sortDirection}
                  />
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
                  onClick={() => handleSort("deliveryNoteType")}
                >
                  Type
                  <SortIcon active={sortColumn === "deliveryNoteType"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("deliveryDate")}
                >
                  Delivery Date
                  <SortIcon active={sortColumn === "deliveryDate"} direction={sortDirection} />
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
                  Linked CoC
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/delivery-notes/${note.id}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {note.deliveryNoteNumber || `DN-${note.id}`}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {note.supplierCompanyName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {typeBadge(note.deliveryNoteType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {note.deliveryDate ? new Date(note.deliveryDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{statusBadge(note.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {note.linkedCocId ? (
                      <Link
                        href={`/au-rubber/portal/supplier-cocs/${note.linkedCocId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View CoC
                      </Link>
                    ) : (
                      <span className="text-gray-400">Not linked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/au-rubber/portal/delivery-notes/${note.id}`}
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
          totalItems={filteredNotes.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="notes"
          onPageChange={setCurrentPage}
        />
      </FileDropZone>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowUploadModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Delivery Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF Documents
                  </label>
                  <FileDropZone
                    onFilesSelected={(files) => setUploadFiles((prev) => [...prev, ...files])}
                    className="border-2 border-dashed rounded-lg"
                    disabled={isUploading}
                  />
                  {uploadFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0"
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as DeliveryNoteType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="COMPOUND">Compound (from Compounder)</option>
                    <option value="ROLL">Roll (from Calendarer)</option>
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
                  <label className="block text-sm font-medium text-gray-700">DN Number</label>
                  <input
                    type="text"
                    value={uploadDnNumber}
                    onChange={(e) => setUploadDnNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="e.g., DN1294"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                  <input
                    type="date"
                    value={uploadDeliveryDate}
                    onChange={(e) => setUploadDeliveryDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadSupplierId}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isUploading
                    ? "Uploading..."
                    : uploadFiles.length > 0
                      ? `Upload ${uploadFiles.length} File${uploadFiles.length > 1 ? "s" : ""}`
                      : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
