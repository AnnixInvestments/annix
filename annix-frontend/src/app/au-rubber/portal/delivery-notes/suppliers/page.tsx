"use client";

import { isArray } from "es-toolkit/compat";
import { Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { FileDropZone } from "@/app/au-rubber/components/FileDropZone";
import { useTablePreferences } from "@/app/au-rubber/hooks/useTablePreferences";
import {
  Pagination,
  SortIcon,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import {
  auRubberApiClient,
  type DeliveryNoteStatus,
  type DeliveryNoteType,
  type ExtractedDeliveryNoteData,
  type RubberDeliveryNoteDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import NixProcessingPopup from "@/app/lib/nix/components/NixProcessingPopup";
import { useAuRubberCompanies, useAuRubberDeliveryNotes } from "@/app/lib/query/hooks";

type SortColumn =
  | "deliveryNoteNumber"
  | "supplierCompanyName"
  | "deliveryNoteType"
  | "poRef"
  | "rollNumbers"
  | "status"
  | "deliveryDate"
  | "linkedCoc";

export default function SupplierDeliveryNotesPage() {
  const { showToast } = useToast();
  const { branding } = useAuRubberBranding();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<DeliveryNoteType | "">("");
  const [filterStatus, setFilterStatus] = useState<DeliveryNoteStatus | "">("");
  const [showAllVersions, setShowAllVersions] = useState(false);
  const notesQuery = useAuRubberDeliveryNotes({
    deliveryNoteType: filterType || undefined,
    status: filterStatus || undefined,
    includeAllVersions: showAllVersions || undefined,
  });
  const companiesQuery = useAuRubberCompanies();
  const rawCompaniesQueryData = companiesQuery.data;
  const rawNotesQueryData = notesQuery.data;
  const allCompanies = rawCompaniesQueryData || [];
  const suppliers = allCompanies.filter((c) => c.companyType === "SUPPLIER");
  const supplierIds = new Set(suppliers.map((c) => c.id));
  const notes = (rawNotesQueryData || []).filter((n) => supplierIds.has(n.supplierCompanyId));
  const isLoading = notesQuery.isLoading;
  const error = notesQuery.error;
  const [currentPage, setCurrentPage] = useState(0);
  const tablePrefs = useTablePreferences("supplierDeliveryNotes", {
    pageSize: 25,
    sortColumn: "deliveryDate",
    sortDirection: "desc",
  });
  const pageSize = tablePrefs.pageSize;
  const sortColumn = tablePrefs.sortColumn as SortColumn;
  const sortDirection = tablePrefs.sortDirection;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadDetail, setUploadDetail] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customerCompanies = allCompanies.filter((c) => c.companyType === "CUSTOMER");
  const [isAutoLinking, setIsAutoLinking] = useState(false);

  const handleBulkAutoLink = async () => {
    try {
      setIsAutoLinking(true);
      const result = await auRubberApiClient.bulkAutoLinkDeliveryNotes();
      if (result.linked > 0) {
        showToast(`Auto-linked ${result.linked} delivery note(s) to supplier CoCs`, "success");
        await notesQuery.refetch();
      } else {
        showToast("No matching delivery notes found to link", "info");
      }
    } catch (err) {
      showToast("Failed to auto-link delivery notes", "error");
    } finally {
      setIsAutoLinking(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      tablePrefs.setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      tablePrefs.setSortColumn(column);
      tablePrefs.setSortDirection("asc");
    }
  };

  const sortNotes = (notesToSort: RubberDeliveryNoteDto[]): RubberDeliveryNoteDto[] => {
    return [...notesToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "deliveryNoteNumber") {
        const rawADeliveryNoteNumber = a.deliveryNoteNumber;
        const rawBDeliveryNoteNumber = b.deliveryNoteNumber;
        return (
          direction * (rawADeliveryNoteNumber || "").localeCompare(rawBDeliveryNoteNumber || "")
        );
      }
      if (sortColumn === "supplierCompanyName") {
        const rawASupplierCompanyName = a.supplierCompanyName;
        const rawBSupplierCompanyName = b.supplierCompanyName;
        return (
          direction * (rawASupplierCompanyName || "").localeCompare(rawBSupplierCompanyName || "")
        );
      }
      if (sortColumn === "deliveryNoteType") {
        return direction * a.deliveryNoteType.localeCompare(b.deliveryNoteType);
      }
      if (sortColumn === "status") {
        return direction * a.status.localeCompare(b.status);
      }
      if (sortColumn === "poRef") {
        return direction * notePoRef(a).localeCompare(notePoRef(b));
      }
      if (sortColumn === "rollNumbers") {
        return (
          direction * noteRollNumbers(a).join(", ").localeCompare(noteRollNumbers(b).join(", "))
        );
      }
      if (sortColumn === "deliveryDate") {
        const rawADeliveryDate = a.deliveryDate;
        const rawBDeliveryDate = b.deliveryDate;
        return direction * (rawADeliveryDate || "").localeCompare(rawBDeliveryDate || "");
      }
      if (sortColumn === "linkedCoc") {
        const aLinked = a.linkedCocId ? 1 : 0;
        const bLinked = b.linkedCocId ? 1 : 0;
        return direction * (aLinked - bLinked);
      }
      return 0;
    });
  };

  const filteredNotes = sortNotes(
    notes.filter((note) => {
      if (searchQuery === "") return true;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        note.deliveryNoteNumber?.toLowerCase().includes(q) ||
        note.supplierCompanyName?.toLowerCase().includes(q) ||
        notePoRef(note).toLowerCase().includes(q) ||
        noteRollNumbers(note).some((r) => r.toLowerCase().includes(q));
      return matchesSearch;
    }),
  );

  const effectivePageSize = pageSize === 0 ? filteredNotes.length : pageSize;
  const paginatedNotes = filteredNotes.slice(
    currentPage * effectivePageSize,
    (currentPage + 1) * effectivePageSize,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterType, filterStatus, showAllVersions, pageSize]);

  const handleAuthorizeVersion = async (id: number) => {
    try {
      await auRubberApiClient.authorizeVersion("delivery-notes", id);
      showToast("Version authorized successfully", "success");
      notesQuery.refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to authorize version", "error");
    }
  };

  const handleRejectVersion = async (id: number) => {
    try {
      await auRubberApiClient.rejectVersion("delivery-notes", id);
      showToast("Version rejected", "success");
      notesQuery.refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject version", "error");
    }
  };

  const handleDeleteNote = async (id: number, dnNumber: string) => {
    // eslint-disable-next-line no-restricted-globals -- legacy sync confirm pending modal migration (issue #175)
    if (!confirm(`Delete delivery note ${dnNumber}?`)) return;
    try {
      await auRubberApiClient.deleteDeliveryNote(id);
      showToast("Delivery note deleted", "success");
      notesQuery.refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0 || isUploading) return;
    try {
      setIsUploading(true);
      setUploadProgress(5);
      setUploadStatus(`Uploading ${files.length} file${files.length !== 1 ? "s" : ""}...`);
      setUploadDetail("Preparing files for analysis...");

      const progressSteps = [
        {
          pct: 15,
          status: "NIX is analysing your delivery notes...",
          detail: "Detecting suppliers from document content...",
        },
        {
          pct: 30,
          status: "Identifying suppliers...",
          detail: "Matching documents to known supplier formats...",
        },
        {
          pct: 45,
          status: "Extracting delivery note data...",
          detail: "Reading roll numbers, weights, and dimensions...",
        },
        { pct: 60, status: "Processing pages...", detail: "Extracting data from each page..." },
        { pct: 75, status: "Almost done...", detail: "Finalising extraction results..." },
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];
          setUploadProgress(step.pct);
          setUploadStatus(step.status);
          setUploadDetail(step.detail);
          stepIndex += 1;
        }
      }, 3000);

      await auRubberApiClient.uploadDeliveryNoteWithFiles(files, {
        deliveryNoteType: "ROLL" as DeliveryNoteType,
      });

      clearInterval(progressInterval);

      setUploadProgress(90);
      setUploadStatus("Upload complete!");
      setUploadDetail("NIX is extracting data in the background...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUploadProgress(100);
      setUploadStatus("Complete!");
      setUploadDetail("All files processed successfully.");

      await new Promise((resolve) => setTimeout(resolve, 800));
      showToast(
        `${files.length} file${files.length !== 1 ? "s" : ""} uploaded — NIX is extracting data in the background`,
        "success",
      );
      notesQuery.refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload delivery notes", "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
      setUploadDetail("");
    }
  };

  const statusBadge = (status: DeliveryNoteStatus) => {
    const colors: Record<DeliveryNoteStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      EXTRACTED: "bg-purple-100 text-purple-800",
      APPROVED: "bg-teal-100 text-teal-800",
      LINKED: "bg-blue-100 text-blue-800",
      STOCK_CREATED: "bg-green-100 text-green-800",
    };
    const labels: Record<DeliveryNoteStatus, string> = {
      PENDING: "Pending",
      EXTRACTED: "Extracted",
      APPROVED: "Approved",
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

  const extractedDataSingle = (
    data: ExtractedDeliveryNoteData | ExtractedDeliveryNoteData[] | null,
  ): ExtractedDeliveryNoteData | null => {
    if (!data) return null;
    if (isArray(data)) {
      const rawDataAt0 = data[0];
      return rawDataAt0 || null;
    }
    return data;
  };

  const notePoRef = (note: RubberDeliveryNoteDto): string => {
    const rawNoteCustomerReference = note.customerReference;
    const extractedRef = extractedDataSingle(note.extractedData)?.customerReference;
    return rawNoteCustomerReference || extractedRef || "";
  };

  const noteRollNumbers = (note: RubberDeliveryNoteDto): string[] => {
    const ed = extractedDataSingle(note.extractedData);
    const rawEdRolls = ed?.rolls;
    return (rawEdRolls || []).map((r) => r.rollNumber).filter(Boolean);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => notesQuery.refetch()}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Delivery Notes" }, { label: "Suppliers" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-3" />
            Supplier Delivery Notes
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Track compound and roll deliveries from suppliers
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/au-rubber/portal/delivery-notes/scan"
            className="inline-flex items-center px-4 py-2 border border-orange-600 rounded-md shadow-sm text-sm font-medium text-orange-600 bg-white hover:bg-orange-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Scan & Analyze
          </Link>
          <button
            onClick={handleBulkAutoLink}
            disabled={isAutoLinking}
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 disabled:opacity-50"
          >
            {isAutoLinking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4 mr-2" />
            )}
            {isAutoLinking ? "Linking..." : "Auto-Link All"}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Upload Delivery Notes
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const rawTargetFiles = e.target.files;
              const files = Array.from(rawTargetFiles || []);
              if (files.length > 0) handleFilesSelected(files);
              e.target.value = "";
            }}
          />
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
              placeholder="DN number, supplier, PO, roll"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DeliveryNoteType | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border"
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
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="EXTRACTED">Extracted</option>
              <option value="APPROVED">Approved</option>
              <option value="LINKED">Linked</option>
              <option value="STOCK_CREATED">Stock Created</option>
            </select>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllVersions}
              onChange={(e) => setShowAllVersions(e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-gray-700">Show All Versions</span>
          </label>
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-lg hover:bg-orange-100 hover:border-orange-400 transition-colors"
      >
        <div className="flex items-center justify-center py-6 px-4">
          <svg
            className="w-8 h-8 text-orange-500 mr-3"
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
          <span className="text-orange-700 font-medium">
            Drag and drop delivery note files here, or click to browse
          </span>
        </div>
      </FileDropZone>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState
            message="Loading supplier delivery notes..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        ) : filteredNotes.length === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <TableIcons.document className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No supplier delivery notes found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterType || filterStatus
                  ? "Try adjusting your filters"
                  : "Drag & drop PDF files above or click to upload"}
              </p>
              {!searchQuery && !filterType && !filterStatus && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
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
                  Upload Delivery Notes
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
                  onClick={() => handleSort("poRef")}
                >
                  PO / Ref
                  <SortIcon active={sortColumn === "poRef"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("rollNumbers")}
                >
                  Roll Numbers
                  <SortIcon active={sortColumn === "rollNumbers"} direction={sortDirection} />
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("linkedCoc")}
                >
                  Linked CoC
                  <SortIcon active={sortColumn === "linkedCoc"} direction={sortDirection} />
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedNotes.map((note) => {
                const rawNoteDeliveryNoteNumber = note.deliveryNoteNumber;
                const rawNoteSupplierCompanyName = note.supplierCompanyName;
                const rawNoteDeliveryNoteNumber2 = note.deliveryNoteNumber;
                const isInactive =
                  note.versionStatus === "SUPERSEDED" || note.versionStatus === "REJECTED";
                const isPendingAuth = note.versionStatus === "PENDING_AUTHORIZATION";
                return (
                  <tr
                    key={note.id}
                    className={`hover:bg-gray-50 ${isInactive ? "opacity-40" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/au-rubber/portal/delivery-notes/${note.id}`}
                          className="text-orange-600 hover:text-orange-800 font-medium"
                        >
                          {rawNoteDeliveryNoteNumber || `DN-${note.id}`}
                        </Link>
                        {note.version > 1 && (
                          <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                            v{note.version}
                          </span>
                        )}
                        {isPendingAuth && (
                          <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                            Awaiting Authorization
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rawNoteSupplierCompanyName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeBadge(note.deliveryNoteType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {notePoRef(note) || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {noteRollNumbers(note).length > 0 ? noteRollNumbers(note).join(", ") : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {note.deliveryDate ? formatDateZA(note.deliveryDate) : "-"}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      {isPendingAuth && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAuthorizeVersion(note.id)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Authorize
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectVersion(note.id)}
                            className="text-amber-600 hover:text-amber-800 font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <Link
                        href={`/au-rubber/portal/delivery-notes/${note.id}`}
                        className="text-orange-600 hover:text-orange-800"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteNote(note.id, rawNoteDeliveryNoteNumber2 || `DN-${note.id}`)
                        }
                        className="text-red-400 hover:text-red-600"
                        title="Delete delivery note"
                      >
                        <svg
                          className="w-4 h-4 inline"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredNotes.length}
          itemsPerPage={pageSize}
          itemName="notes"
          onPageChange={setCurrentPage}
          onPageSizeChange={tablePrefs.setPageSize}
        />
      </div>

      <NixProcessingPopup
        isVisible={isUploading}
        progress={uploadProgress}
        statusMessage={uploadStatus}
        detailMessage={uploadDetail}
        headerColor={branding.primaryColor}
        headerContent={
          branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Company logo" className="h-8 object-contain" />
          ) : null
        }
      />
    </div>
  );
}
