"use client";

import { isArray } from "es-toolkit/compat";
import { FileText, Link2, Loader2, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { CustomerDnAnalysisModal } from "@/app/au-rubber/components/CustomerDnAnalysisModal";
import { FileDropZone } from "@/app/au-rubber/components/FileDropZone";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useTablePreferences } from "@/app/au-rubber/hooks/useTablePreferences";
import { waitForReExtractionComplete } from "@/app/au-rubber/lib/waitForReExtractionComplete";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import {
  Pagination,
  SortIcon,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { toastError } from "@/app/lib/api/apiError";
import {
  type AnalyzeCustomerDnsResult,
  auRubberApiClient,
  type CustomerDnOverride,
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
  | "customerReference"
  | "rollNumbers"
  | "deliveryNoteType"
  | "status"
  | "deliveryDate"
  | "auCocNumber";

const SERVER_SORTABLE_CDN_COLUMNS = new Set<SortColumn>([
  "deliveryNoteNumber",
  "supplierCompanyName",
  "customerReference",
  "deliveryNoteType",
  "status",
  "deliveryDate",
  "auCocNumber",
]);

export default function CustomerDeliveryNotesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { branding } = useAuRubberBranding();
  const rawBrandingPrimaryColor = branding?.primaryColor;
  const { showExtraction, hideExtraction, updateExtraction } = useExtractionProgress();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [analyzeDetail, setAnalyzeDetail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<DeliveryNoteType | "">("");
  const [filterStatus, setFilterStatus] = useState<DeliveryNoteStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const tablePrefs = useTablePreferences("customerDeliveryNotes", {
    pageSize: 25,
    sortColumn: "deliveryNoteNumber",
    sortDirection: "desc",
  });
  const pageSize = tablePrefs.pageSize;
  const sortColumn = tablePrefs.sortColumn as SortColumn;
  const sortDirection = tablePrefs.sortDirection;
  const serverSortColumn = SERVER_SORTABLE_CDN_COLUMNS.has(sortColumn) ? sortColumn : undefined;
  const notesQuery = useAuRubberDeliveryNotes({
    deliveryNoteType: filterType || undefined,
    status: filterStatus || undefined,
    companyType: "CUSTOMER",
    search: searchQuery || undefined,
    sortColumn: serverSortColumn,
    sortDirection,
    page: currentPage + 1,
    pageSize: pageSize === 0 ? 10000 : pageSize,
    pollWhilePending: true,
  });
  const companiesQuery = useAuRubberCompanies();
  const rawCompaniesQueryData = companiesQuery.data;
  const rawNotesQueryData = notesQuery.data;
  const allCompanies = rawCompaniesQueryData || [];
  const customers = allCompanies.filter((c) => c.companyType === "CUSTOMER");
  const notes = rawNotesQueryData ? rawNotesQueryData.items : [];
  const totalNotes = rawNotesQueryData ? rawNotesQueryData.total : 0;
  const isLoading = notesQuery.isLoading;
  const error = notesQuery.error;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<DeliveryNoteType>("COMPOUND");
  const [uploadCustomerId, setUploadCustomerId] = useState<number | null>(null);
  const [uploadDnNumber, setUploadDnNumber] = useState("");
  const [uploadDeliveryDate, setUploadDeliveryDate] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeCustomerDnsResult | null>(null);
  const [analysisFiles, setAnalysisFiles] = useState<File[]>([]);
  const [reanalyzingId, setReanalyzingId] = useState<number | null>(null);
  const [isAutoLinking, setIsAutoLinking] = useState(false);

  const handleBulkAutoLinkCdns = async () => {
    try {
      setIsAutoLinking(true);
      const result = await auRubberApiClient.bulkLinkCustomerDns();
      if (result.linked > 0) {
        showToast(`Auto-linked ${result.linked} customer DN(s) to supplier CoCs`, "success");
        await notesQuery.refetch();
      } else {
        showToast("No matching customer DNs found to link", "info");
      }
    } catch (err) {
      showToast("Failed to auto-link customer delivery notes", "error");
    } finally {
      setIsAutoLinking(false);
    }
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

  const noteRollNumbers = (note: RubberDeliveryNoteDto): string[] => {
    const ed = extractedDataSingle(note.extractedData);
    const rawEdRolls = ed?.rolls;
    return (rawEdRolls || []).map((r) => r.rollNumber).filter(Boolean);
  };

  const handleSort = (column: SortColumn) => {
    if (!SERVER_SORTABLE_CDN_COLUMNS.has(column)) return;
    if (sortColumn === column) {
      tablePrefs.setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      tablePrefs.setSortColumn(column);
      tablePrefs.setSortDirection("asc");
    }
  };

  const paginatedNotes = notes;

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterType, filterStatus, pageSize, sortColumn, sortDirection]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisFiles(files);
    setAnalyzeProgress(5);
    setAnalyzeStatus(`Uploading ${files.length} file${files.length !== 1 ? "s" : ""}...`);
    setAnalyzeDetail("Preparing files for analysis...");

    const progressSteps = [
      {
        pct: 15,
        status: "Nix is analysing your delivery notes...",
        detail: "Reading document pages...",
      },
      {
        pct: 30,
        status: "Identifying customers...",
        detail: "Matching customer names to known companies...",
      },
      {
        pct: 50,
        status: "Extracting delivery note data...",
        detail: "Reading roll numbers, weights, and dimensions...",
      },
      {
        pct: 70,
        status: "Processing line items...",
        detail: "Grouping items by delivery note number...",
      },
    ];

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        const step = progressSteps[stepIndex];
        setAnalyzeProgress(step.pct);
        setAnalyzeStatus(step.status);
        setAnalyzeDetail(step.detail);
        stepIndex += 1;
      }
    }, 3000);

    try {
      const result = await auRubberApiClient.analyzeCustomerDeliveryNotes(files);
      clearInterval(progressInterval);
      setAnalyzeProgress(90);
      setAnalyzeStatus("Analysis complete!");
      setAnalyzeDetail(`Found ${result.groups.length} delivery note(s)`);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAnalysisResult(result);
      showToast(`Found ${result.groups.length} delivery note(s)`, "success");
    } catch (err) {
      clearInterval(progressInterval);
      toastError(showToast, err, "Failed to analyze files");
      setAnalysisResult(null);
      setAnalysisFiles([]);
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress(0);
      setAnalyzeStatus("");
      setAnalyzeDetail("");
    }
  };

  const handleAnalysisConfirm = async (overrides: CustomerDnOverride[]) => {
    if (!analysisResult || analysisFiles.length === 0) return;

    setIsUploading(true);

    try {
      const modifiedAnalysis = {
        ...analysisResult,
        groups: analysisResult.groups.map((group, idx) => {
          const override = overrides[idx];
          if (override?.lineItems) {
            return { ...group, allLineItems: override.lineItems };
          }
          return group;
        }),
      };

      const result = await auRubberApiClient.createCustomerDnsFromAnalysis(
        analysisFiles,
        modifiedAnalysis,
        overrides,
      );
      showToast(`Created ${result.deliveryNoteIds.length} delivery note(s)`, "success");
      setAnalysisResult(null);
      setAnalysisFiles([]);
      await notesQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to create delivery notes");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalysisClose = () => {
    setAnalysisResult(null);
    setAnalysisFiles([]);
  };

  const handleManualFilesSelected = (files: File[]) => {
    setUploadFiles((prev) => [...prev, ...files]);
    if (!showUploadModal) {
      setShowUploadModal(true);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!uploadCustomerId) {
      showToast("Please select a customer", "error");
      return;
    }
    try {
      setIsUploading(true);
      if (uploadFiles.length > 0) {
        await auRubberApiClient.uploadDeliveryNoteWithFiles(uploadFiles, {
          deliveryNoteType: uploadType,
          supplierCompanyId: uploadCustomerId,
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
          supplierCompanyId: uploadCustomerId,
          deliveryNoteNumber: uploadDnNumber || undefined,
          deliveryDate: uploadDeliveryDate || undefined,
        });
        showToast("Delivery note created", "success");
      }
      setShowUploadModal(false);
      setUploadCustomerId(null);
      setUploadDnNumber("");
      setUploadDeliveryDate("");
      setUploadFiles([]);
      await notesQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to create delivery note");
    } finally {
      setIsUploading(false);
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
      toastError(showToast, err, "Failed to delete");
    }
  };

  const handleReanalyze = async (noteId: number) => {
    try {
      setReanalyzingId(noteId);
      await auRubberApiClient.extractDeliveryNote(noteId);
      showToast("Re-analysis complete", "success");
      await notesQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to re-analyze delivery note");
    } finally {
      setReanalyzingId(null);
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => notesQuery.refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Delivery Notes" }, { label: "Customers" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
            Customer Delivery Notes
          </h1>
          <p className="mt-1 text-sm text-gray-600">Track deliveries to customers</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleBulkAutoLinkCdns}
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
            onClick={async () => {
              const confirmed = await confirmDialog({
                title: "Clean up duplicate delivery notes?",
                message:
                  "Finds delivery notes with the same DN number and supplier, keeps the oldest, and deletes the rest. Use this to clean up duplicates created before the re-extract bug fix.",
                confirmLabel: "Clean Up Duplicates",
                variant: "danger",
              });
              if (!confirmed) return;
              try {
                const result = await auRubberApiClient.dedupeDeliveryNotes();
                showToast(
                  `Removed ${result.deleted} duplicate(s) across ${result.groups} DN group(s); kept ${result.kept}.`,
                  "success",
                );
                await notesQuery.refetch();
              } catch (err) {
                toastError(showToast, err, "Dedupe failed");
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            Clean Up Duplicates
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirmDialog({
                title: "Re-extract all customer delivery notes?",
                message:
                  "This re-runs Vision AI on every customer DN with a document attached. Existing extracted data will be overwritten. The job runs in the background and can take several minutes.",
                confirmLabel: "Re-extract All",
              });
              if (!confirmed) return;
              setIsReExtracting(true);
              const queueDepth = totalNotes;
              const estMs = Math.max(15000, queueDepth * 18000);
              showExtraction({
                brand: "au-rubber",
                label: `Re-extracting ${queueDepth} customer DNs (background)…`,
                estimatedDurationMs: estMs,
                itemCount: queueDepth,
              });
              try {
                const baselineSnapshot = await auRubberApiClient.deliveryNotes({
                  companyType: "CUSTOMER",
                  pageSize: 10000,
                  includeAllVersions: true,
                });
                const baselineByIdString = baselineSnapshot.items.reduce<Record<string, string>>(
                  (acc, n) => {
                    acc[String(n.id)] = n.updatedAt;
                    return acc;
                  },
                  {},
                );
                const result = await auRubberApiClient.reExtractAllDeliveryNotes("CUSTOMER");
                await waitForReExtractionComplete({
                  ids: new Set(result.deliveryNoteIds),
                  baselineByIdString,
                  total: result.triggered,
                  fetcher: () =>
                    auRubberApiClient.deliveryNotes({
                      companyType: "CUSTOMER",
                      pageSize: 10000,
                      includeAllVersions: true,
                    }),
                  toItems: (res) =>
                    res.items.map((n) => ({
                      id: n.id,
                      updatedAtIso: n.updatedAt,
                    })),
                  onProgress: (done) => {
                    updateExtraction({
                      label: `Re-extracted ${done} of ${result.triggered} customer DNs…`,
                    });
                  },
                });
                notesQuery.refetch();
              } catch (err) {
                toastError(showToast, err, "Re-extraction failed");
              } finally {
                hideExtraction();
                setIsReExtracting(false);
              }
            }}
            disabled={isReExtracting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isReExtracting ? "animate-spin" : ""}`} />
            {isReExtracting ? "Re-extracting..." : "Re-extract All"}
          </button>
          <Link
            href="/au-rubber/portal/delivery-notes/scan"
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
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
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Delivery Note
          </button>
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
              placeholder="DN number, customer, PO"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DeliveryNoteType | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
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
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="EXTRACTED">Extracted</option>
              <option value="APPROVED">Approved</option>
              <option value="LINKED">Linked</option>
              <option value="STOCK_CREATED">Stock Created</option>
            </select>
          </div>
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center justify-center py-6 px-4">
          <svg
            className="w-8 h-8 text-blue-500 mr-3"
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
          <span className="text-blue-700 font-medium">
            Drag and drop delivery note files here, or click to browse
          </span>
        </div>
      </FileDropZone>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState
            message="Loading customer delivery notes..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        ) : totalNotes === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <TableIcons.document className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No customer delivery notes found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterType || filterStatus
                  ? "Try adjusting your filters"
                  : "Drag & drop PDF files above or click to upload"}
              </p>
              {!searchQuery && !filterType && !filterStatus && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
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
                  Customer
                  <SortIcon
                    active={sortColumn === "supplierCompanyName"}
                    direction={sortDirection}
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("customerReference")}
                >
                  Customer Ref
                  <SortIcon active={sortColumn === "customerReference"} direction={sortDirection} />
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("auCocNumber")}
                >
                  AU CoC
                  <SortIcon active={sortColumn === "auCocNumber"} direction={sortDirection} />
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
                const rawNoteCustomerReference = note.customerReference;
                const rawNoteAuCocNumber = note.auCocNumber;
                return (
                  <tr
                    key={note.id}
                    onClick={() => router.push(`/au-rubber/portal/delivery-notes/${note.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/au-rubber/portal/delivery-notes/${note.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {rawNoteDeliveryNoteNumber || `DN-${note.id}`}
                        </Link>
                        {note.documentPathSiblingCount > 1 && (
                          <span
                            className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700"
                            title={`This DN shares its source PDF with ${note.documentPathSiblingCount - 1} other DN${note.documentPathSiblingCount > 2 ? "s" : ""}`}
                          >
                            🔗 Multi-DN PDF ({note.documentPathSiblingCount})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rawNoteSupplierCompanyName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rawNoteCustomerReference || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {noteRollNumbers(note).length > 0 ? noteRollNumbers(note).join(", ") : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeBadge(note.deliveryNoteType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {note.deliveryDate ? formatDateZA(note.deliveryDate) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{statusBadge(note.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {note.auCocId ? (
                        <Link
                          href={`/au-rubber/portal/au-cocs/${note.auCocId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          {rawNoteAuCocNumber || "View AU CoC"}
                        </Link>
                      ) : note.linkedCocId ? (
                        <span className="text-teal-600">Linked</span>
                      ) : (
                        <span className="text-gray-400">Not linked</span>
                      )}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleReanalyze(note.id)}
                        disabled={reanalyzingId === note.id}
                        className="text-orange-600 hover:text-orange-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reanalyzingId === note.id ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="animate-spin h-3 w-3 mr-1" />
                            Analyzing...
                          </span>
                        ) : (
                          "Reanalyze"
                        )}
                      </button>
                      <Link
                        href={`/au-rubber/portal/delivery-notes/${note.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteNote(note.id, rawNoteDeliveryNoteNumber || `DN-${note.id}`)
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
          totalItems={totalNotes}
          itemsPerPage={pageSize}
          itemName="notes"
          onPageChange={setCurrentPage}
          onPageSizeChange={tablePrefs.setPageSize}
        />
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowUploadModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Customer Delivery Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documents (PDF, images)
                  </label>
                  <FileDropZone
                    onFilesSelected={handleManualFilesSelected}
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  >
                    <option value="COMPOUND">Compound</option>
                    <option value="ROLL">Roll</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    value={uploadCustomerId || ""}
                    onChange={(e) =>
                      setUploadCustomerId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="e.g., DN1294"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                  <input
                    type="date"
                    value={uploadDeliveryDate}
                    onChange={(e) => setUploadDeliveryDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
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
                  disabled={isUploading || !uploadCustomerId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
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

      <NixProcessingPopup
        isVisible={isAnalyzing}
        progress={analyzeProgress}
        statusMessage={analyzeStatus}
        detailMessage={analyzeDetail}
        headerColor={rawBrandingPrimaryColor || undefined}
        headerContent={
          branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Company Logo" className="h-10 object-contain" />
          ) : (
            <img
              src="/au-industries/logo.jpg"
              alt="AU Industries"
              className="h-10 object-contain"
            />
          )
        }
      />

      {analysisResult && (
        <CustomerDnAnalysisModal
          analysis={analysisResult}
          files={analysisFiles}
          customers={customers}
          onClose={handleAnalysisClose}
          onConfirm={handleAnalysisConfirm}
          isCreating={isUploading}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}
