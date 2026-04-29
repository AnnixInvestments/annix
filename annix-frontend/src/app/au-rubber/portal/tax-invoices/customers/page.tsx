"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Download, FileText, RefreshCw, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { FileDropZone } from "@/app/au-rubber/components/FileDropZone";
import {
  Pagination,
  SortDirection,
  SortIcon,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";

const ITEMS_PER_PAGE = 25;

import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import {
  auRubberApiClient,
  type RubberTaxInvoiceDto,
  type TaxInvoiceStatus,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import NixProcessingPopup from "@/app/lib/nix/components/NixProcessingPopup";
import { useAuRubberCompanies, useAuRubberTaxInvoices } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys";

const CustomerSageExportModal = lazy(() => import("../CustomerSageExportModal"));

type SortColumn =
  | "invoiceNumber"
  | "companyName"
  | "status"
  | "invoiceDate"
  | "totalAmount"
  | "vatAmount";

const SERVER_SORTABLE_TI_CUSTOMER_COLUMNS = new Set<SortColumn>([
  "invoiceNumber",
  "companyName",
  "status",
  "invoiceDate",
  "totalAmount",
  "vatAmount",
]);

export default function CustomerTaxInvoicesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { branding } = useAuRubberBranding();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaxInvoiceStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auRubber.customerTaxInvoices.pageSize",
    ITEMS_PER_PAGE,
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const serverSortColumn = SERVER_SORTABLE_TI_CUSTOMER_COLUMNS.has(sortColumn)
    ? sortColumn
    : undefined;
  const taxInvoicesQuery = useAuRubberTaxInvoices({
    invoiceType: "CUSTOMER",
    status: filterStatus || undefined,
    search: searchQuery || undefined,
    sortColumn: serverSortColumn,
    sortDirection,
    page: currentPage + 1,
    pageSize: pageSize === 0 ? 10000 : pageSize,
  });
  const companiesQuery = useAuRubberCompanies();
  const rawTaxInvoicesData = taxInvoicesQuery.data;
  const rawCompaniesData = companiesQuery.data;
  const taxInvoicesQueryIsLoading = taxInvoicesQuery.isLoading;
  const companiesQueryIsLoading = companiesQuery.isLoading;
  const taxInvoicesQueryError = taxInvoicesQuery.error;
  const companiesQueryError = companiesQuery.error;
  const invoices = rawTaxInvoicesData ? rawTaxInvoicesData.items : [];
  const totalInvoices = rawTaxInvoicesData ? rawTaxInvoicesData.total : 0;
  const allCompanies = rawCompaniesData || [];
  const customers = allCompanies.filter((c) => c.companyType === "CUSTOMER");
  const isLoading = taxInvoicesQueryIsLoading || companiesQueryIsLoading;
  const error = taxInvoicesQueryError || companiesQueryError;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: rubberKeys.taxInvoices.all });
    queryClient.invalidateQueries({ queryKey: rubberKeys.companies.all });
  };
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCustomerId, setUploadCustomerId] = useState<number | null>(null);
  const [uploadInvoiceNumber, setUploadInvoiceNumber] = useState("");
  const [uploadInvoiceDate, setUploadInvoiceDate] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadStatus, setBulkUploadStatus] = useState("");
  const [bulkUploadDetail, setBulkUploadDetail] = useState("");
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedForApproval, setSelectedForApproval] = useState<Set<number>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [showSageExportModal, setShowSageExportModal] = useState(false);
  const [postingToSageId, setPostingToSageId] = useState<number | null>(null);
  const [isBulkPostingToSage, setIsBulkPostingToSage] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);

  const handlePostToSage = async (inv: RubberTaxInvoiceDto) => {
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
    const allApproved = await auRubberApiClient.taxInvoices({
      invoiceType: "CUSTOMER",
      status: "APPROVED",
      search: searchQuery || undefined,
      pageSize: 10000,
    });
    const approvedIds = allApproved.items
      .filter((inv) => inv.sageInvoiceId === null)
      .map((inv) => inv.id);
    if (approvedIds.length === 0) {
      showToast("No approved invoices to post", "error");
      return;
    }
    try {
      setIsBulkPostingToSage(true);
      const result = await auRubberApiClient.postInvoicesToSageBulk(approvedIds);
      const successCount = result.successful.length;
      const failCount = result.failed.length;
      if (failCount === 0) {
        showToast(
          `${successCount} invoice${successCount > 1 ? "s" : ""} posted to Sage`,
          "success",
        );
      } else {
        showToast(
          `${successCount} posted, ${failCount} failed: ${result.failed[0].error}`,
          failCount === approvedIds.length ? "error" : "warning",
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

  const handleSort = (column: SortColumn) => {
    if (!SERVER_SORTABLE_TI_CUSTOMER_COLUMNS.has(column)) return;
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
  }, [searchQuery, filterStatus, pageSize, sortColumn, sortDirection]);

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
          detail: "Detecting customers from document content...",
        },
        {
          pct: 30,
          status: "Identifying customers...",
          detail: "Matching documents to known customer formats...",
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
        invoiceType: "CUSTOMER",
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
      setTimeout(() => refresh(), 5000);
      setTimeout(() => refresh(), 20000);
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
    if (!uploadCustomerId) {
      showToast("Please select a customer", "error");
      return;
    }
    try {
      setIsUploading(true);
      if (uploadFiles.length > 0) {
        await auRubberApiClient.uploadTaxInvoiceWithFiles(uploadFiles, {
          invoiceType: "CUSTOMER",
          companyId: uploadCustomerId,
          invoiceNumber: uploadInvoiceNumber || undefined,
          invoiceDate: uploadInvoiceDate || undefined,
        });
        showToast(
          `${uploadFiles.length} tax invoice${uploadFiles.length > 1 ? "s" : ""} uploaded`,
          "success",
        );
      } else {
        await auRubberApiClient.createTaxInvoice({
          invoiceType: "CUSTOMER",
          companyId: uploadCustomerId,
          invoiceNumber: uploadInvoiceNumber || "Untitled",
          invoiceDate: uploadInvoiceDate || undefined,
        });
        showToast("Tax invoice created", "success");
      }
      setShowUploadModal(false);
      setUploadCustomerId(null);
      setUploadInvoiceNumber("");
      setUploadInvoiceDate("");
      setUploadFiles([]);
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
      <Breadcrumb items={[{ label: "Customers" }, { label: "Tax Invoices" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-3" />
            Customer Tax Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-600">Track tax invoices issued to customers</p>
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
            onClick={async () => {
              const confirmed = await confirm({
                title: "Clean up duplicate tax invoices?",
                message:
                  "Finds tax invoices with the same invoice number, customer, and type, keeps the oldest, and deletes the rest.",
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
              const confirmed = await confirm({
                title: "Re-extract all customer tax invoices?",
                message:
                  "This re-runs Vision AI on every customer tax invoice with a document attached. Existing extracted data will be overwritten. The job runs in the background and can take several minutes.",
                confirmLabel: "Re-extract All",
              });
              if (!confirmed) return;
              setIsReExtracting(true);
              const queueDepth = totalInvoices;
              const estMs = Math.max(15000, queueDepth * 18000);
              showExtraction({
                brand: "au-rubber",
                label: `Re-extracting ${queueDepth} customer invoices (background)…`,
                estimatedDurationMs: estMs,
                itemCount: queueDepth,
              });
              try {
                const result = await auRubberApiClient.reExtractAllTaxInvoices("CUSTOMER");
                showToast(
                  `Re-extraction triggered for ${result.triggered} invoices. This may take a few minutes.`,
                  "success",
                );
                setTimeout(() => refresh(), 30000);
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
            message="Loading customer tax invoices..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        ) : totalInvoices === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <TableIcons.document className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No customer tax invoices found
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {hasApprovable && (
                  <th scope="col" className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedInvoices.filter((inv) => inv.status === "EXTRACTED").length > 0 &&
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("invoiceNumber")}
                >
                  Invoice #
                  <SortIcon active={sortColumn === "invoiceNumber"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("companyName")}
                >
                  Customer
                  <SortIcon active={sortColumn === "companyName"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  PO / Reference
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("invoiceDate")}
                >
                  Date
                  <SortIcon active={sortColumn === "invoiceDate"} direction={sortDirection} />
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
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("totalAmount")}
                >
                  Total
                  <SortIcon active={sortColumn === "totalAmount"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("vatAmount")}
                >
                  VAT
                  <SortIcon active={sortColumn === "vatAmount"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInvoices.map((inv) => {
                const rawInvCompanyName = inv.companyName;
                const extractedData = inv.extractedData;
                const orderNumber = extractedData ? extractedData.orderNumber : null;
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/au-rubber/portal/tax-invoices/${inv.id}`)}
                  >
                    {hasApprovable && (
                      <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/au-rubber/portal/tax-invoices/${inv.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-orange-600 font-medium hover:text-orange-800 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rawInvCompanyName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {orderNumber || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inv.invoiceDate ? formatDateZA(inv.invoiceDate) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {statusBadge(inv.status)}
                        {inv.postedToSageAt ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            Posted
                          </span>
                        ) : inv.exportedToSageAt ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Exported
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(inv.vatAmount)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right">
                      <span className="flex items-center justify-end gap-1">
                        {inv.status === "APPROVED" && inv.sageInvoiceId === null && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePostToSage(inv);
                            }}
                            disabled={postingToSageId === inv.id}
                            className="text-gray-400 hover:text-indigo-600 disabled:opacity-50"
                            title="Post to Sage"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
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

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowUploadModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Customer Tax Invoice</h3>
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
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    value={uploadCustomerId || ""}
                    onChange={(e) =>
                      setUploadCustomerId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
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
                  disabled={isUploading || !uploadCustomerId}
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
          <CustomerSageExportModal
            onClose={() => setShowSageExportModal(false)}
            onSuccess={() => refresh()}
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
