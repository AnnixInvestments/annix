"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { CheckInboundEmailsButton } from "@/app/au-rubber/components/CheckInboundEmailsButton";
import { FileDropZone } from "@/app/au-rubber/components/FileDropZone";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import {
  Pagination,
  SortDirection,
  SortIcon,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import { toastError } from "@/app/lib/api/apiError";
import {
  auRubberApiClient,
  type RubberTaxInvoiceDto,
  type TaxInvoiceStatus,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useScrollRestoration } from "@/app/lib/hooks/useScrollRestoration";
import NixProcessingPopup from "@/app/lib/nix/components/NixProcessingPopup";
import { useAuRubberCompanies, useAuRubberTaxInvoices } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys";

const ITEMS_PER_PAGE = 25;

type SortColumn = "invoiceNumber" | "companyName" | "status" | "invoiceDate" | "totalAmount";

const SERVER_SORTABLE_COLUMNS = new Set<SortColumn>([
  "invoiceNumber",
  "companyName",
  "status",
  "invoiceDate",
  "totalAmount",
]);

export default function SupplierCreditNotesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { branding } = useAuRubberBranding();
  const scrollSentinelRef = useScrollRestoration("au-rubber:supplier-credit-notes");
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaxInvoiceStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auRubber.supplierCreditNotes.pageSize",
    ITEMS_PER_PAGE,
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const serverSortColumn = SERVER_SORTABLE_COLUMNS.has(sortColumn) ? sortColumn : undefined;
  const creditNotesQuery = useAuRubberTaxInvoices({
    invoiceType: "SUPPLIER",
    isCreditNote: true,
    status: filterStatus || undefined,
    search: searchQuery || undefined,
    sortColumn: serverSortColumn,
    sortDirection,
    page: currentPage + 1,
    pageSize: pageSize === 0 ? 10000 : pageSize,
    pollWhilePending: true,
  });
  const companiesQuery = useAuRubberCompanies();
  const rawCreditNotesData = creditNotesQuery.data;
  const rawCompaniesData = companiesQuery.data;
  const allCompanies = rawCompaniesData || [];
  const creditNotes = rawCreditNotesData ? rawCreditNotesData.items : [];
  const totalCreditNotes = rawCreditNotesData ? rawCreditNotesData.total : 0;
  const suppliers = allCompanies.filter((c) => c.companyType === "SUPPLIER");
  const creditNotesLoading = creditNotesQuery.isLoading;
  const companiesLoading = companiesQuery.isLoading;
  const isLoading = creditNotesLoading || companiesLoading;
  const creditNotesError = creditNotesQuery.error;
  const companiesError = companiesQuery.error;
  const error = creditNotesError || companiesError;
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
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number, invoiceNumber: string) => {
    const confirmed = await confirm({
      title: "Delete Credit Note",
      message: `Delete credit note ${invoiceNumber}? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      setDeletingId(id);
      await auRubberApiClient.deleteTaxInvoice(id);
      showToast(`Credit note ${invoiceNumber} deleted`, "success");
      refresh();
    } catch (err) {
      toastError(showToast, err, "Failed to delete credit note");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (!SERVER_SORTABLE_COLUMNS.has(column)) return;
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus, pageSize, sortColumn, sortDirection]);

  const uploadCreditNotes = async (files: File[], supplierId: number): Promise<void> => {
    await files.reduce(
      (chain, file) =>
        chain.then(async () => {
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const created = await auRubberApiClient.createTaxInvoice({
            invoiceType: "SUPPLIER",
            companyId: supplierId,
            invoiceNumber: baseName || "Untitled",
            isCreditNote: true,
          });
          await auRubberApiClient.uploadTaxInvoiceDocument(created.id, file);
        }),
      Promise.resolve(),
    );
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0 || isBulkUploading) return;
    const supplier = suppliers[0];
    if (suppliers.length !== 1) {
      setUploadFiles(files);
      setShowUploadModal(true);
      return;
    }
    try {
      setIsBulkUploading(true);
      setBulkUploadProgress(5);
      setBulkUploadStatus(`Uploading ${files.length} file${files.length !== 1 ? "s" : ""}...`);
      setBulkUploadDetail("Preparing credit notes for analysis...");

      const progressSteps = [
        {
          pct: 25,
          status: "NIX is reading your credit notes...",
          detail: "Detecting credit note details from document content...",
        },
        {
          pct: 50,
          status: "Extracting credit note data...",
          detail: "Reading credit note numbers, dates, and roll references...",
        },
        { pct: 75, status: "Almost done...", detail: "Finalising upload..." },
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

      await uploadCreditNotes(files, supplier.id);

      clearInterval(progressInterval);

      setBulkUploadProgress(90);
      setBulkUploadStatus("Upload complete!");
      setBulkUploadDetail("NIX is extracting data in the background...");

      await new Promise((resolve) => setTimeout(resolve, 800));
      setBulkUploadProgress(100);
      setBulkUploadStatus("Complete!");
      setBulkUploadDetail("All files processed successfully.");

      await new Promise((resolve) => setTimeout(resolve, 600));
      alert({
        message: `${files.length} credit note${files.length !== 1 ? "s" : ""} uploaded`,
        variant: "success",
      });
      refresh();
    } catch (err) {
      toastError(showToast, err, "Failed to upload credit notes");
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
        await uploadCreditNotes(uploadFiles, uploadSupplierId);
        alert({
          message: `${uploadFiles.length} credit note${uploadFiles.length > 1 ? "s" : ""} uploaded`,
          variant: "success",
        });
      } else {
        await auRubberApiClient.createTaxInvoice({
          invoiceType: "SUPPLIER",
          companyId: uploadSupplierId,
          invoiceNumber: uploadInvoiceNumber || "Untitled",
          invoiceDate: uploadInvoiceDate || undefined,
          isCreditNote: true,
        });
        showToast("Credit note created", "success");
      }
      setShowUploadModal(false);
      setUploadSupplierId(null);
      setUploadInvoiceNumber("");
      setUploadInvoiceDate("");
      setUploadFiles([]);
      refresh();
    } catch (err) {
      toastError(showToast, err, "Failed to create credit note");
    } finally {
      setIsUploading(false);
    }
  };

  const statusBadge = (status: TaxInvoiceStatus) => {
    const colors: Record<TaxInvoiceStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      EXTRACTED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
    };
    const labels: Record<TaxInvoiceStatus, string> = {
      PENDING: "Pending",
      EXTRACTED: "Extracted",
      APPROVED: "Approved",
      FAILED: "Failed",
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
    <div ref={scrollSentinelRef} className="space-y-6">
      {ConfirmDialog}
      {AlertDialog}
      <Breadcrumb items={[{ label: "Suppliers" }, { label: "Credit Notes" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-3" />
            Supplier Credit Notes
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Track credit notes received from suppliers for returned goods
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CheckInboundEmailsButton onPolled={refresh} />
          <button
            onClick={() => setShowUploadModal(true)}
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
              placeholder="Credit note number, company"
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
            Drag and drop credit note files here, or click to browse (PDF, Word, Excel)
          </span>
        </div>
      </FileDropZone>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState
            message="Loading supplier credit notes..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        ) : totalCreditNotes === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <TableIcons.document className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No supplier credit notes found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterStatus
                  ? "Try adjusting your filters"
                  : "Drag & drop PDF files above or click to upload"}
              </p>
              {!searchQuery && !filterStatus && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
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
                  Add Credit Note
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("invoiceNumber")}
                  >
                    Credit Note #
                    <SortIcon active={sortColumn === "invoiceNumber"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("invoiceDate")}
                  >
                    Date
                    <SortIcon active={sortColumn === "invoiceDate"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("companyName")}
                  >
                    Supplier
                    <SortIcon active={sortColumn === "companyName"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Linked Calender Roll CoC
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
                {creditNotes.map((cn: RubberTaxInvoiceDto) => {
                  const companyName = cn.companyName;
                  const linkedCocNumber = cn.linkedCalenderRollCocNumber;
                  return (
                    <tr
                      key={cn.id}
                      onClick={() =>
                        router.push(`/au-rubber/portal/supplier-credit-notes/${cn.id}`)
                      }
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Link
                          href={`/au-rubber/portal/supplier-credit-notes/${cn.id}`}
                          className="text-red-600 text-sm font-medium hover:text-red-800 hover:underline"
                        >
                          {cn.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {cn.invoiceDate ? formatDateZA(cn.invoiceDate) : "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {companyName || "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {linkedCocNumber || <span className="text-gray-400">Not linked</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(cn.totalAmount)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{statusBadge(cn.status)}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cn.id, cn.invoiceNumber);
                          }}
                          disabled={deletingId === cn.id}
                          className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                          title="Delete credit note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          totalItems={totalCreditNotes}
          itemsPerPage={pageSize}
          itemName="credit notes"
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFiles([]);
              }}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Supplier Credit Note</h3>
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
                  <label className="block text-sm font-medium text-gray-700">
                    Credit Note Number
                  </label>
                  <input
                    type="text"
                    value={uploadInvoiceNumber}
                    onChange={(e) => setUploadInvoiceNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                    placeholder="e.g., CN-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Credit Note Date
                  </label>
                  <DateInput
                    value={uploadInvoiceDate}
                    onChange={(value) => setUploadInvoiceDate(value)}
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
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
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
