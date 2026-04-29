"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Download,
  FileText,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldX,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { FileDropZone } from "@/app/au-rubber/components/FileDropZone";
import { waitForReExtractionComplete } from "@/app/au-rubber/lib/waitForReExtractionComplete";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import {
  Pagination,
  SortDirection,
  SortIcon,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import NixProcessingPopup from "@/app/lib/nix/components/NixProcessingPopup";

const ITEMS_PER_PAGE = 25;

import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useToast } from "@/app/components/Toast";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import {
  auRubberApiClient,
  type RubberTaxInvoiceDto,
  type TaxInvoiceStatus,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAuRubberCompanies, useAuRubberTaxInvoices } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys";

const SageExportModal = lazy(() => import("../SageExportModal"));

const MOULDED_PRODUCT_PREFIX_RE = /^(CPL|FPL|TBR|TRB)-/i;

function invoiceNeedsRollDetails(inv: RubberTaxInvoiceDto): boolean {
  const rawInvUnit = inv.unit;
  const unitForCheck = rawInvUnit ? rawInvUnit : "";
  const unitLower = unitForCheck.toLowerCase();
  const isRollUnit = unitLower === "roll" || unitLower === "rolls";
  if (!isRollUnit) return false;
  const extractedData = inv.extractedData;
  const lineItems = extractedData ? extractedData.lineItems : [];
  if (lineItems.length === 0) return false;
  const hasAnyRolls = lineItems.some((li) => li.rolls && li.rolls.length > 0);
  if (hasAnyRolls) return false;
  const rollFormLineItems = lineItems.filter(
    (li) => !MOULDED_PRODUCT_PREFIX_RE.test(li.description.trim()),
  );
  return rollFormLineItems.length > 0;
}

type SortColumn =
  | "invoiceNumber"
  | "companyName"
  | "status"
  | "invoiceDate"
  | "totalAmount"
  | "productDescription"
  | "numberOfRolls"
  | "costPerUnit"
  | "unit";

const SERVER_SORTABLE_TI_SUPPLIER_COLUMNS = new Set<SortColumn>([
  "invoiceNumber",
  "companyName",
  "status",
  "invoiceDate",
  "totalAmount",
]);

export default function SupplierTaxInvoicesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { branding } = useAuRubberBranding();
  const { showExtraction, hideExtraction, updateExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaxInvoiceStatus | "">("");
  const [includeAllVersions, setIncludeAllVersions] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auRubber.supplierTaxInvoices.pageSize",
    ITEMS_PER_PAGE,
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const serverSortColumn = SERVER_SORTABLE_TI_SUPPLIER_COLUMNS.has(sortColumn)
    ? sortColumn
    : undefined;
  const taxInvoicesQuery = useAuRubberTaxInvoices({
    invoiceType: "SUPPLIER",
    status: filterStatus || undefined,
    includeAllVersions: includeAllVersions || undefined,
    isCreditNote: false,
    search: searchQuery || undefined,
    sortColumn: serverSortColumn,
    sortDirection,
    page: currentPage + 1,
    pageSize: pageSize === 0 ? 10000 : pageSize,
    pollWhilePending: true,
  });
  const creditNotesQuery = useAuRubberTaxInvoices({
    invoiceType: "SUPPLIER",
    includeAllVersions: includeAllVersions || undefined,
    isCreditNote: true,
    pageSize: 1000,
  });
  const companiesQuery = useAuRubberCompanies();
  const rawTaxInvoicesData = taxInvoicesQuery.data;
  const rawCreditNotesData = creditNotesQuery.data;
  const rawCompaniesData = companiesQuery.data;
  const taxInvoicesQueryIsLoading = taxInvoicesQuery.isLoading;
  const companiesQueryIsLoading = companiesQuery.isLoading;
  const taxInvoicesQueryError = taxInvoicesQuery.error;
  const companiesQueryError = companiesQuery.error;
  const allCompanies = rawCompaniesData || [];
  const invoices = rawTaxInvoicesData ? rawTaxInvoicesData.items : [];
  const totalInvoices = rawTaxInvoicesData ? rawTaxInvoicesData.total : 0;
  const creditNotes = rawCreditNotesData ? rawCreditNotesData.items : [];
  const suppliers = allCompanies.filter((c) => c.companyType === "SUPPLIER");
  const isLoading = taxInvoicesQueryIsLoading || companiesQueryIsLoading;
  const error = taxInvoicesQueryError || companiesQueryError;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: rubberKeys.taxInvoices.all });
    queryClient.invalidateQueries({ queryKey: rubberKeys.companies.all });
  };
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSupplierId, setUploadSupplierId] = useState<number | null>(null);
  const [uploadInvoiceNumber, setUploadInvoiceNumber] = useState("");
  const [uploadInvoiceDate, setUploadInvoiceDate] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadStatus, setBulkUploadStatus] = useState("");
  const [bulkUploadDetail, setBulkUploadDetail] = useState("");
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [uploadIsCreditNote, setUploadIsCreditNote] = useState(false);
  const [showSageExportModal, setShowSageExportModal] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedForApproval, setSelectedForApproval] = useState<Set<number>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [postingToSageId, setPostingToSageId] = useState<number | null>(null);
  const [isBulkPostingToSage, setIsBulkPostingToSage] = useState(false);
  const [authorizingId, setAuthorizingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const handlePostToSage = async (inv: RubberTaxInvoiceDto) => {
    if (invoiceNeedsRollDetails(inv)) {
      showToast(
        `Cannot post ${inv.invoiceNumber} to Sage — roll numbers and weights have not been added yet.`,
        "error",
      );
      return;
    }
    try {
      setPostingToSageId(inv.id);
      await auRubberApiClient.postInvoiceToSage(inv.id);
      showToast(`Invoice ${inv.invoiceNumber} posted to Sage`, "success");
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to post to Sage", "error");
    } finally {
      setPostingToSageId(null);
    }
  };

  const handleBulkPostToSage = async () => {
    try {
      setIsBulkPostingToSage(true);
      const result = await auRubberApiClient.postInvoicesToSageBulkByFilter({
        invoiceType: "SUPPLIER",
        search: searchQuery || undefined,
        includeAllVersions: includeAllVersions || undefined,
      });
      const successCount = result.successful.length;
      const failCount = result.failed.length;
      if (successCount === 0 && failCount === 0) {
        showToast("No approved invoices to post", "error");
      } else if (failCount === 0) {
        showToast(
          `${successCount} invoice${successCount > 1 ? "s" : ""} posted to Sage`,
          "success",
        );
      } else {
        showToast(
          `${successCount} posted, ${failCount} failed: ${result.failed[0].error}`,
          successCount === 0 ? "error" : "warning",
        );
      }
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to post to Sage", "error");
    } finally {
      setIsBulkPostingToSage(false);
    }
  };

  const handleDelete = async (id: number, invoiceNumber: string) => {
    const confirmed = await confirm({
      title: "Delete Tax Invoice",
      message: `Delete tax invoice ${invoiceNumber}? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      setDeletingId(id);
      await auRubberApiClient.deleteTaxInvoice(id);
      showToast(`Tax invoice ${invoiceNumber} deleted`, "success");
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete tax invoice", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleApprovalSelection = (id: number) => {
    setSelectedForApproval((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllApprovalSelection = () => {
    const pageApprovable = paginatedInvoices.filter((inv) => inv.status === "EXTRACTED");
    const allSelected = pageApprovable.every((inv) => selectedForApproval.has(inv.id));
    if (allSelected) {
      setSelectedForApproval((prev) => {
        const next = new Set(prev);
        pageApprovable.forEach((inv) => next.delete(inv.id));
        return next;
      });
    } else {
      setSelectedForApproval((prev) => {
        const next = new Set(prev);
        pageApprovable.forEach((inv) => next.add(inv.id));
        return next;
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedForApproval.size === 0) return;
    try {
      setIsBulkApproving(true);
      const ids = Array.from(selectedForApproval);
      await ids.reduce(
        (chain, id) =>
          chain.then(() => auRubberApiClient.approveTaxInvoice(id).then(() => undefined)),
        Promise.resolve() as Promise<void>,
      );
      showToast(
        `Approved ${ids.length} invoice${ids.length > 1 ? "s" : ""} successfully`,
        "success",
      );
      setSelectedForApproval(new Set());
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve invoices", "error");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleAuthorizeVersion = async (inv: RubberTaxInvoiceDto) => {
    try {
      setAuthorizingId(inv.id);
      await auRubberApiClient.authorizeVersion("tax-invoices", inv.id);
      showToast(`Invoice ${inv.invoiceNumber} version authorized`, "success");
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to authorize version", "error");
    } finally {
      setAuthorizingId(null);
    }
  };

  const handleRejectVersion = async (inv: RubberTaxInvoiceDto) => {
    const confirmed = await confirm({
      title: "Reject Version",
      message: `Reject version of invoice ${inv.invoiceNumber}? This cannot be undone.`,
      confirmLabel: "Reject",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      setRejectingId(inv.id);
      await auRubberApiClient.rejectVersion("tax-invoices", inv.id);
      showToast(`Invoice ${inv.invoiceNumber} version rejected`, "success");
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject version", "error");
    } finally {
      setRejectingId(null);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (!SERVER_SORTABLE_TI_SUPPLIER_COLUMNS.has(column)) return;
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const paginatedInvoices = invoices;
  const hasApprovable = paginatedInvoices.some((inv) => inv.status === "EXTRACTED");

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus, pageSize, sortColumn, sortDirection, includeAllVersions]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0 || isBulkUploading) return;
    try {
      setIsBulkUploading(true);
      setBulkUploadProgress(5);
      setBulkUploadStatus(`Uploading ${files.length} file${files.length !== 1 ? "s" : ""}...`);
      setBulkUploadDetail("Preparing files for analysis...");

      const progressSteps = [
        {
          pct: 15,
          status: "NIX is reading your tax invoices...",
          detail: "Detecting suppliers from document content...",
        },
        {
          pct: 30,
          status: "Identifying suppliers...",
          detail: "Matching documents to known supplier formats...",
        },
        {
          pct: 45,
          status: "Extracting invoice data...",
          detail: "Reading invoice numbers, dates, and line items...",
        },
        { pct: 60, status: "Processing pages...", detail: "Extracting data from each page..." },
        { pct: 75, status: "Almost done...", detail: "Finalising extraction results..." },
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];
          setBulkUploadProgress(step.pct);
          setBulkUploadStatus(step.status);
          setBulkUploadDetail(step.detail);
          stepIndex += 1;
        }
      }, 3000);

      await auRubberApiClient.uploadTaxInvoiceWithFiles(files, {
        invoiceType: "SUPPLIER",
      });

      clearInterval(progressInterval);

      setBulkUploadProgress(90);
      setBulkUploadStatus("Upload complete!");
      setBulkUploadDetail("NIX is extracting data in the background...");

      await new Promise((resolve) => setTimeout(resolve, 800));
      setBulkUploadProgress(100);
      setBulkUploadStatus("Complete!");
      setBulkUploadDetail("All files processed successfully.");

      await new Promise((resolve) => setTimeout(resolve, 600));
      showToast(
        `${files.length} file${files.length !== 1 ? "s" : ""} uploaded — NIX is extracting data in the background`,
        "success",
      );
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload tax invoices", "error");
    } finally {
      setIsBulkUploading(false);
      setBulkUploadProgress(0);
      setBulkUploadStatus("");
      setBulkUploadDetail("");
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
        await auRubberApiClient.uploadTaxInvoiceWithFiles(uploadFiles, {
          invoiceType: "SUPPLIER",
          companyId: uploadSupplierId,
          invoiceNumber: uploadInvoiceNumber || undefined,
          invoiceDate: uploadInvoiceDate || undefined,
        });
        showToast(
          `${uploadFiles.length} tax invoice${uploadFiles.length > 1 ? "s" : ""} uploaded`,
          "success",
        );
      } else {
        await auRubberApiClient.createTaxInvoice({
          invoiceType: "SUPPLIER",
          companyId: uploadSupplierId,
          invoiceNumber: uploadInvoiceNumber || "Untitled",
          invoiceDate: uploadInvoiceDate || undefined,
          isCreditNote: uploadIsCreditNote || undefined,
        });
        showToast(uploadIsCreditNote ? "Credit note created" : "Tax invoice created", "success");
      }
      setShowUploadModal(false);
      setUploadSupplierId(null);
      setUploadInvoiceNumber("");
      setUploadInvoiceDate("");
      setUploadFiles([]);
      setUploadIsCreditNote(false);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create tax invoice", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const statusBadge = (status: TaxInvoiceStatus) => {
    const colors: Record<TaxInvoiceStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      EXTRACTED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-green-100 text-green-800",
    };
    const labels: Record<TaxInvoiceStatus, string> = {
      PENDING: "Pending",
      EXTRACTED: "Extracted",
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

  const formatCurrency = (amount: number | null): string => {
    if (amount == null) return "-";
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={refresh}
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
      {ConfirmDialog}
      <Breadcrumb items={[{ label: "Suppliers" }, { label: "Tax Invoices" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-3" />
            Supplier Tax Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-600">Track tax invoices received from suppliers</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedForApproval.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isBulkApproving
                ? "Approving..."
                : `Approve ${selectedForApproval.size} invoice${selectedForApproval.size > 1 ? "s" : ""}`}
            </button>
          )}
          <button
            onClick={handleBulkPostToSage}
            disabled={isBulkPostingToSage}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            {isBulkPostingToSage ? "Posting..." : "Post All to Sage"}
          </button>
          <button
            onClick={() => setShowSageExportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Sage
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: "Clean up duplicate tax invoices?",
                message:
                  "Finds tax invoices with the same invoice number, company, and type, keeps the oldest, and deletes the rest.",
                confirmLabel: "Clean Up Duplicates",
                variant: "danger",
              });
              if (!confirmed) return;
              try {
                const result = await auRubberApiClient.dedupeTaxInvoices();
                showToast(
                  `Removed ${result.deleted} duplicate(s) across ${result.groups} invoice group(s); kept ${result.kept}.`,
                  "success",
                );
                refresh();
              } catch (err) {
                showToast(err instanceof Error ? err.message : "Dedupe failed", "error");
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            Clean Up Duplicates
          </button>
          <button
            onClick={async () => {
              setIsReExtracting(true);
              const queueDepth = totalInvoices;
              const estMs = Math.max(15000, queueDepth * 18000);
              showExtraction({
                brand: "au-rubber",
                label: `Re-extracting ${queueDepth} supplier invoices (background)…`,
                estimatedDurationMs: estMs,
                itemCount: queueDepth,
              });
              try {
                const baselineSnapshot = await auRubberApiClient.taxInvoices({
                  invoiceType: "SUPPLIER",
                  pageSize: 10000,
                });
                const baselineByIdString = baselineSnapshot.items.reduce<Record<string, string>>(
                  (acc, inv) => {
                    acc[String(inv.id)] = inv.updatedAt;
                    return acc;
                  },
                  {},
                );
                const result = await auRubberApiClient.reExtractAllTaxInvoices("SUPPLIER");
                await waitForReExtractionComplete({
                  ids: new Set(result.invoiceIds),
                  baselineByIdString,
                  total: result.triggered,
                  fetcher: () =>
                    auRubberApiClient.taxInvoices({
                      invoiceType: "SUPPLIER",
                      pageSize: 10000,
                    }),
                  toItems: (res) =>
                    res.items.map((inv) => ({
                      id: inv.id,
                      updatedAtIso: inv.updatedAt,
                    })),
                  onProgress: (done) => {
                    updateExtraction({
                      label: `Re-extracted ${done} of ${result.triggered} supplier invoices…`,
                    });
                  },
                });
                refresh();
              } catch (err) {
                showToast(err instanceof Error ? err.message : "Re-extraction failed", "error");
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
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Tax Invoice
          </button>
          <button
            onClick={() => {
              setUploadIsCreditNote(true);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Credit Note
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
              placeholder="Invoice number, company"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaxInvoiceStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="EXTRACTED">Extracted</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeAllVersions}
              onChange={(e) => setIncludeAllVersions(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-gray-700">Show All Versions</span>
          </label>
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        accept=".pdf,application/pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
            Drag and drop tax invoice files here, or click to browse (PDF, Word, Excel)
          </span>
        </div>
      </FileDropZone>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState
            message="Loading supplier tax invoices..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        ) : totalInvoices === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <TableIcons.document className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No supplier tax invoices found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterStatus
                  ? "Try adjusting your filters"
                  : "Drag & drop PDF files above or click to upload"}
              </p>
              {!searchQuery && !filterStatus && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
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
                  Add Tax Invoice
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {hasApprovable && (
                    <th scope="col" className="px-2 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          paginatedInvoices.filter((inv) => inv.status === "EXTRACTED").length >
                            0 &&
                          paginatedInvoices
                            .filter((inv) => inv.status === "EXTRACTED")
                            .every((inv) => selectedForApproval.has(inv.id))
                        }
                        onChange={toggleAllApprovalSelection}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("invoiceNumber")}
                  >
                    Invoice #
                    <SortIcon active={sortColumn === "invoiceNumber"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("companyName")}
                  >
                    Company
                    <SortIcon active={sortColumn === "companyName"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PO / Reference
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("invoiceDate")}
                  >
                    Doc Date
                    <SortIcon active={sortColumn === "invoiceDate"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("productDescription")}
                  >
                    Description
                    <SortIcon
                      active={sortColumn === "productDescription"}
                      direction={sortDirection}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("numberOfRolls")}
                  >
                    Qty
                    <SortIcon active={sortColumn === "numberOfRolls"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("unit")}
                  >
                    Unit
                    <SortIcon active={sortColumn === "unit"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("costPerUnit")}
                  >
                    Cost/Unit
                    <SortIcon active={sortColumn === "costPerUnit"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("totalAmount")}
                  >
                    Total
                    <SortIcon active={sortColumn === "totalAmount"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    <SortIcon active={sortColumn === "status"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-10"
                  />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedInvoices.map((inv) => {
                  const rawInvCompanyName = inv.companyName;
                  const rawInvProductDescription = inv.productDescription;
                  const rawInvUnit = inv.unit;
                  const extractedData = inv.extractedData;
                  const orderNumber = extractedData ? extractedData.orderNumber : null;
                  const needsRollDetails = invoiceNeedsRollDetails(inv);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/au-rubber/portal/tax-invoices/${inv.id}`)}
                      className={`hover:bg-gray-50 cursor-pointer ${inv.versionStatus === "SUPERSEDED" || inv.versionStatus === "REJECTED" ? "opacity-40" : ""}`}
                    >
                      {hasApprovable && (
                        <td className="px-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                          {inv.status === "EXTRACTED" && (
                            <input
                              type="checkbox"
                              checked={selectedForApproval.has(inv.id)}
                              onChange={() => toggleApprovalSelection(inv.id)}
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Link
                            href={`/au-rubber/portal/tax-invoices/${inv.id}`}
                            className="text-orange-600 text-sm font-medium hover:text-orange-800 hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          {inv.version > 1 && (
                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                              v{inv.version}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {rawInvCompanyName || "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {orderNumber || "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {inv.invoiceDate ? formatDateZA(inv.invoiceDate) : "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {rawInvProductDescription || "-"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {inv.numberOfRolls != null ? inv.numberOfRolls : "-"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {rawInvUnit || "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(inv.costPerUnit)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          {statusBadge(inv.status)}
                          {inv.versionStatus === "PENDING_AUTHORIZATION" && (
                            <span className="px-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                              Awaiting Authorization
                            </span>
                          )}
                          {needsRollDetails && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/au-rubber/portal/tax-invoices/${inv.id}#rolls`);
                              }}
                              className="px-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200"
                              title="Roll numbers and weights need to be added manually"
                            >
                              Add rolls
                            </button>
                          )}
                          {inv.postedToSageAt ? (
                            <span className="px-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                              Posted
                            </span>
                          ) : inv.exportedToSageAt ? (
                            <span className="px-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              Exported
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <span className="flex items-center justify-end gap-1">
                          {inv.versionStatus === "PENDING_AUTHORIZATION" && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAuthorizeVersion(inv);
                                }}
                                disabled={authorizingId === inv.id}
                                className="text-gray-400 hover:text-green-600 disabled:opacity-50"
                                title="Authorize version"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectVersion(inv);
                                }}
                                disabled={rejectingId === inv.id}
                                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                                title="Reject version"
                              >
                                <ShieldX className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(() => {
                            if (inv.status !== "APPROVED" || inv.sageInvoiceId !== null) {
                              return null;
                            }
                            const isPosting = postingToSageId === inv.id;
                            const sageDisabled = isPosting || needsRollDetails;
                            const sageTitle = needsRollDetails
                              ? "Cannot post to Sage — add roll numbers and weights first"
                              : "Post to Sage";
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePostToSage(inv);
                                }}
                                disabled={sageDisabled}
                                className="text-gray-400 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={sageTitle}
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(inv.id, inv.invoiceNumber);
                            }}
                            disabled={deletingId === inv.id}
                            className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={totalInvoices}
          itemsPerPage={pageSize}
          itemName="invoices"
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {creditNotes.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-3" />
              Supplier Credit Notes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Credit notes for returned goods. Approving a credit note marks referenced rolls as
              rejected.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Credit Note #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Original Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rolls
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {creditNotes.map((cn) => {
                  const rawCnOriginalInvoiceNumber = cn.originalInvoiceNumber;
                  const rawExtractedDataOriginalInvoiceRef = cn.extractedData?.originalInvoiceRef;
                  return (
                    <tr key={cn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/au-rubber/portal/tax-invoices/${cn.id}`}
                          className="text-amber-700 hover:text-amber-900 font-medium"
                        >
                          {cn.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cn.companyName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {cn.invoiceDate ? formatDateZA(cn.invoiceDate) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {cn.originalInvoiceId ? (
                          <Link
                            href={`/au-rubber/portal/tax-invoices/${cn.originalInvoiceId}`}
                            className="text-amber-700 hover:text-amber-900"
                          >
                            {rawCnOriginalInvoiceNumber || `#${cn.originalInvoiceId}`}
                          </Link>
                        ) : (
                          <span className="text-gray-400">
                            {rawExtractedDataOriginalInvoiceRef || "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {cn.creditNoteRollNumbers.length > 0 ? (
                          <span className="text-red-600 font-medium">
                            {cn.creditNoteRollNumbers.join(", ")}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {cn.totalAmount != null
                          ? `R ${Number(cn.totalAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">{statusBadge(cn.status)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/au-rubber/portal/tax-invoices/${cn.id}`}
                            className="p-1 text-gray-400 hover:text-amber-600"
                            title="View"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          {cn.status === "PENDING" && (
                            <button
                              onClick={async () => {
                                try {
                                  await auRubberApiClient.extractTaxInvoice(cn.id);
                                  showToast("Credit note extracted", "success");
                                  refresh();
                                } catch (err) {
                                  showToast(
                                    err instanceof Error ? err.message : "Extraction failed",
                                    "error",
                                  );
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Extract"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {cn.status !== "APPROVED" && (
                            <button
                              onClick={async () => {
                                const rollCount = cn.creditNoteRollNumbers.length;
                                const message =
                                  rollCount > 0
                                    ? `Approving this credit note will mark ${rollCount} roll(s) as REJECTED. Continue?`
                                    : "Approve this credit note?";
                                const confirmed = await confirm({
                                  title: "Approve Credit Note",
                                  message,
                                });
                                if (!confirmed) return;
                                try {
                                  await auRubberApiClient.approveTaxInvoice(cn.id);
                                  showToast(
                                    "Credit note approved — rolls marked as rejected",
                                    "success",
                                  );
                                  refresh();
                                } catch (err) {
                                  showToast(
                                    err instanceof Error ? err.message : "Approval failed",
                                    "error",
                                  );
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: "Delete Credit Note",
                                message: "Delete this credit note?",
                              });
                              if (!confirmed) return;
                              try {
                                await auRubberApiClient.deleteTaxInvoice(cn.id);
                                showToast("Credit note deleted", "success");
                                refresh();
                              } catch (err) {
                                showToast(
                                  err instanceof Error ? err.message : "Failed to delete",
                                  "error",
                                );
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => {
                setShowUploadModal(false);
                setUploadIsCreditNote(false);
              }}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {uploadIsCreditNote ? "Add Supplier Credit Note" : "Add Supplier Tax Invoice"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documents (PDF, images, Word, Excel)
                  </label>
                  <FileDropZone
                    onFilesSelected={(files) => setUploadFiles((prev) => [...prev, ...files])}
                    accept=".pdf,application/pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <select
                    value={uploadSupplierId || ""}
                    onChange={(e) =>
                      setUploadSupplierId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                  <input
                    type="text"
                    value={uploadInvoiceNumber}
                    onChange={(e) => setUploadInvoiceNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                    placeholder="e.g., INV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
                  <input
                    type="date"
                    value={uploadInvoiceDate}
                    onChange={(e) => setUploadInvoiceDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
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

      {showSageExportModal && (
        <Suspense fallback={null}>
          <SageExportModal
            onClose={() => setShowSageExportModal(false)}
            onSuccess={() => refresh()}
            invoiceOptions={invoices
              .filter((inv) => inv.status === "APPROVED")
              .map((inv) => {
                const companyName = inv.companyName;
                const company = companyName || "Unknown";
                return { id: inv.id, label: `${inv.invoiceNumber} — ${company}` };
              })}
          />
        </Suspense>
      )}

      <NixProcessingPopup
        isVisible={isBulkUploading}
        progress={bulkUploadProgress}
        statusMessage={bulkUploadStatus}
        detailMessage={bulkUploadDetail}
        headerColor={branding.primaryColor}
        headerContent={
          branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Company logo" className="h-8 object-contain" />
          ) : (
            <img src="/au-industries/logo.jpg" alt="AU Industries" className="h-8 object-contain" />
          )
        }
      />
    </div>
  );
}
