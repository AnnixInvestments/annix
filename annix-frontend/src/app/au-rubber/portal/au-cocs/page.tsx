"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Mail, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import {
  Pagination,
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { toastError } from "@/app/lib/api/apiError";
import {
  type AuCocStatus,
  auRubberApiClient,
  type RubberAuCocDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAuRubberAuCocs } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys";
import { Breadcrumb } from "../../components/Breadcrumb";
import { CocEmailModal, type CocEmailMode } from "../../components/CocEmailModal";

type SortColumn =
  | "cocNumber"
  | "customerCompanyName"
  | "poNumber"
  | "deliveryNoteRef"
  | "rolls"
  | "status"
  | "createdAt";

export default function AuCocsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAdmin } = useAuRubberAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AuCocStatus | "">("");
  const cocsQuery = useAuRubberAuCocs({
    status: filterStatus || undefined,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: rubberKeys.auCocs.all });
  const rawCocsQueryData = cocsQuery.data;
  const cocs = rawCocsQueryData || [];
  const isLoading = cocsQuery.isLoading;
  const error = cocsQuery.error;
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<number | "all">(25);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [sendCc, setSendCc] = useState("");
  const [sendBcc, setSendBcc] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailModalMode, setEmailModalMode] = useState<CocEmailMode | null>(null);
  const pdfPreview = usePdfPreview();
  const [progressModal, setProgressModal] = useState<{
    visible: boolean;
    title: string;
    status: "running" | "done" | "error";
    message: string;
    current?: number;
    total?: number;
    currentLabel?: string;
  }>({ visible: false, title: "", status: "running", message: "" });

  const handleBulkAutoGenerate = async () => {
    const draftCocs = cocs.filter((c) => c.status === "DRAFT");
    if (draftCocs.length === 0) {
      setProgressModal({
        visible: true,
        title: "Auto-Generation Complete",
        status: "done",
        message: "No draft CoCs found.",
      });
      return;
    }
    try {
      setIsAutoGenerating(true);
      let generated = 0;
      const failures: string[] = [];
      for (const [i, coc] of draftCocs.entries()) {
        setProgressModal({
          visible: true,
          title: "Auto-Generating CoCs",
          status: "running",
          message: `Generating ${coc.cocNumber}...`,
          current: i + 1,
          total: draftCocs.length,
          currentLabel: coc.cocNumber,
        });
        try {
          const result = await auRubberApiClient.autoGenerateAuCoc(coc.id);
          if (result.generated) {
            generated++;
          } else {
            failures.push(`${coc.cocNumber}: ${result.reason}`);
          }
        } catch (err) {
          failures.push(`${coc.cocNumber}: ${err instanceof Error ? err.message : "failed"}`);
        }
      }
      const failedInfo = failures.length > 0 ? `\n${failures.join("\n")}` : "";
      const summary =
        generated > 0
          ? `Auto-generated ${generated} of ${draftCocs.length} draft CoC(s).${failedInfo}`
          : `Checked ${draftCocs.length} draft CoC(s) — none ready for generation.${failedInfo}`;
      setProgressModal({
        visible: true,
        title: "Auto-Generation Complete",
        status: failures.length > 0 && generated === 0 ? "error" : "done",
        message: summary,
      });
      await refresh();
    } catch (err) {
      setProgressModal({
        visible: true,
        title: "Auto-Generation Failed",
        status: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleRegenerateAll = async () => {
    try {
      setIsRegenerating(true);
      setProgressModal({
        visible: true,
        title: "Regenerating CoCs",
        status: "running",
        message: "Regenerating all previously generated CoCs...",
      });
      const result = await auRubberApiClient.regenerateAllGeneratedCocs();
      const failedInfo =
        result.failed > 0 ? ` ${result.failed} failed: ${result.errors.join("; ")}` : "";
      const summary = `Regenerated ${result.regenerated} of ${result.total} CoC(s).${failedInfo}`;
      setProgressModal({
        visible: true,
        title: "Regeneration Complete",
        status: result.failed > 0 ? "error" : "done",
        message: summary,
      });
      await refresh();
    } catch (err) {
      setProgressModal({
        visible: true,
        title: "Regeneration Failed",
        status: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEmailModalSend = async (params: {
    cocIds: number[];
    email: string;
    cc: string | undefined;
    bcc: string | undefined;
    customerName: string;
  }) => {
    const mode = emailModalMode;
    if (!mode) return;
    const cocsToSend = cocs.filter((c) => params.cocIds.includes(c.id));
    if (cocsToSend.length === 0) {
      showToast("No CoCs selected", "error");
      return;
    }
    const emailOpts = { cc: params.cc, bcc: params.bcc };
    const actionLabel = mode === "send" ? "Sending" : "Resending";
    const doneLabel = mode === "send" ? "Send" : "Resend";
    const setLoading = mode === "send" ? setIsBulkSending : setIsResending;
    try {
      setLoading(true);
      setEmailModalMode(null);
      let sent = 0;
      const sentNumbers: string[] = [];
      const failures: string[] = [];
      for (const [i, coc] of cocsToSend.entries()) {
        setProgressModal({
          visible: true,
          title: `${actionLabel} CoCs`,
          status: "running",
          message: `${actionLabel} ${coc.cocNumber} to ${params.email}...`,
          current: i + 1,
          total: cocsToSend.length,
          currentLabel: coc.cocNumber,
        });
        try {
          await auRubberApiClient.sendAuCoc(coc.id, params.email, emailOpts);
          sent++;
          sentNumbers.push(coc.cocNumber);
        } catch (err) {
          failures.push(`${coc.cocNumber}: ${err instanceof Error ? err.message : "failed"}`);
        }
      }
      const failedInfo = failures.length > 0 ? `\nFailed: ${failures.join(", ")}` : "";
      setProgressModal({
        visible: true,
        title: `${doneLabel} Complete`,
        status: failures.length > 0 && sent === 0 ? "error" : "done",
        message: `${doneLabel === "Send" ? "Sent" : "Resent"} ${sent} of ${cocsToSend.length} CoC(s) for ${params.customerName} to ${params.email}: ${sentNumbers.join(", ")}${failedInfo}`,
      });
      await refresh();
    } catch (err) {
      setProgressModal({
        visible: true,
        title: `${doneLabel} Failed`,
        status: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortCocs = (cocsToSort: RubberAuCocDto[]): RubberAuCocDto[] => {
    return [...cocsToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "cocNumber") {
        return direction * a.cocNumber.localeCompare(b.cocNumber);
      }
      if (sortColumn === "customerCompanyName") {
        const rawACustomerCompanyName = a.customerCompanyName;
        const rawBCustomerCompanyName = b.customerCompanyName;
        return (
          direction * (rawACustomerCompanyName || "").localeCompare(rawBCustomerCompanyName || "")
        );
      }
      if (sortColumn === "status") {
        return direction * a.status.localeCompare(b.status);
      }
      if (sortColumn === "poNumber") {
        const rawAPoNumber = a.poNumber;
        const rawBPoNumber = b.poNumber;
        return direction * (rawAPoNumber || "").localeCompare(rawBPoNumber || "");
      }
      if (sortColumn === "deliveryNoteRef") {
        const rawADeliveryNoteRef = a.deliveryNoteRef;
        const rawBDeliveryNoteRef = b.deliveryNoteRef;
        return direction * (rawADeliveryNoteRef || "").localeCompare(rawBDeliveryNoteRef || "");
      }
      if (sortColumn === "rolls") {
        const rawAItemCount = a.itemCount;
        const rawBItemCount = b.itemCount;
        return direction * ((rawAItemCount || 0) - (rawBItemCount || 0));
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
        coc.cocNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.customerCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.deliveryNoteRef?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }),
  );

  const paginatedCocs =
    pageSize === "all"
      ? filteredCocs
      : filteredCocs.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus, pageSize]);

  const handleGeneratePdf = async (id: number) => {
    try {
      await auRubberApiClient.generateAuCocPdf(id);
      showToast("PDF generated successfully", "success");
      refresh();
    } catch (err) {
      toastError(showToast, err, "Failed to generate PDF");
    }
  };

  const handlePreview = async (coc: RubberAuCocDto) => {
    try {
      setPreviewingId(coc.id);
      pdfPreview.openWithFetch(
        () => auRubberApiClient.auCocPdfBlob(coc.id),
        `${coc.cocNumber}.pdf`,
      );
    } catch (err) {
      toastError(showToast, err, "Failed to preview PDF");
    } finally {
      setPreviewingId(null);
    }
  };

  const closePdfPreview = () => {
    pdfPreview.close();
  };

  const handleDownload = async (coc: RubberAuCocDto) => {
    try {
      setDownloadingId(coc.id);
      pdfPreview.openWithFetch(
        () => auRubberApiClient.downloadAuCocPdf(coc.id),
        `${coc.cocNumber}.pdf`,
      );
    } catch (err) {
      toastError(showToast, err, "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSend = async () => {
    if (!sendingId || !sendEmail) {
      showToast("Please enter an email address", "error");
      return;
    }
    const ccValue = sendCc.trim() || undefined;
    const bccValue = sendBcc.trim() || undefined;
    try {
      setIsSending(true);
      await auRubberApiClient.sendAuCoc(sendingId, sendEmail, { cc: ccValue, bcc: bccValue });
      showToast("CoC sent successfully", "success");
      setShowSendModal(false);
      setSendingId(null);
      setSendEmail("");
      setSendCc("");
      setSendBcc("");
      refresh();
    } catch (err) {
      toastError(showToast, err, "Failed to send CoC");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await auRubberApiClient.deleteAuCoc(deletingId);
      showToast("Certificate deleted successfully", "success");
      setShowDeleteModal(false);
      setDeletingId(null);
      refresh();
    } catch (err) {
      toastError(showToast, err, "Failed to delete certificate");
    } finally {
      setIsDeleting(false);
    }
  };

  const statusBadge = (status: AuCocStatus) => {
    const colors: Record<AuCocStatus, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      GENERATED: "bg-blue-100 text-blue-800",
      SENT: "bg-green-100 text-green-800",
    };
    const labels: Record<AuCocStatus, string> = {
      DRAFT: "Draft",
      GENERATED: "Generated",
      SENT: "Sent",
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const readinessBadge = (coc: RubberAuCocDto) => {
    if (!coc.readinessStatus || coc.readinessStatus === "NOT_TRACKED") return null;

    const readinessColors: Record<string, string> = {
      WAITING_FOR_CALENDERER_COC: "bg-orange-100 text-orange-700",
      WAITING_FOR_COMPOUNDER_COC: "bg-orange-100 text-orange-700",
      WAITING_FOR_GRAPH: "bg-orange-100 text-orange-700",
      WAITING_FOR_APPROVAL: "bg-yellow-100 text-yellow-700",
      READY_FOR_GENERATION: "bg-emerald-100 text-emerald-700",
      AUTO_GENERATED: "bg-purple-100 text-purple-700",
      GENERATION_FAILED: "bg-red-100 text-red-700",
    };
    const readinessLabels: Record<string, string> = {
      WAITING_FOR_CALENDERER_COC: "Waiting: Calenderer",
      WAITING_FOR_COMPOUNDER_COC: "Waiting: Compounder",
      WAITING_FOR_GRAPH: "Waiting: Graph",
      WAITING_FOR_APPROVAL: "Waiting: Approval",
      READY_FOR_GENERATION: "Ready",
      AUTO_GENERATED: "Auto-generated",
      GENERATION_FAILED: "Generation Failed",
    };
    const rawReadinessColorsByCocreadinessstatus = readinessColors[coc.readinessStatus];
    const rawReadinessLabelsByCocreadinessstatus = readinessLabels[coc.readinessStatus];

    return (
      <span
        className={`ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rawReadinessColorsByCocreadinessstatus || "bg-gray-100 text-gray-600"}`}
        title={
          coc.readinessDetails?.missingDocuments?.length
            ? `Missing: ${coc.readinessDetails.missingDocuments.join(", ")}`
            : undefined
        }
      >
        {rawReadinessLabelsByCocreadinessstatus || coc.readinessStatus}
      </span>
    );
  };

  const draftCount = cocs.filter((c) => c.status === "DRAFT").length;
  const generatedCount = cocs.filter((c) => c.status === "GENERATED").length;
  const sentCount = cocs.filter((c) => c.status === "SENT").length;
  const autoGeneratedCount = cocs.filter((c) => c.readinessStatus === "AUTO_GENERATED").length;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => refresh()}
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
      <Breadcrumb items={[{ label: "AU Certificates" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AU Certificates of Conformance</h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate and manage certificates for customers
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleBulkAutoGenerate}
            disabled={isAutoGenerating}
            className="inline-flex items-center px-4 py-2 border border-yellow-600 rounded-md shadow-sm text-sm font-medium text-yellow-600 bg-white hover:bg-yellow-50 disabled:opacity-50"
          >
            {isAutoGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {isAutoGenerating ? "Generating..." : "Auto-Generate All"}
          </button>
          <button
            onClick={handleRegenerateAll}
            disabled={isRegenerating}
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isRegenerating ? "Regenerating..." : "Regenerate All"}
          </button>
          {generatedCount > 0 && (
            <button
              onClick={() => setEmailModalMode("send")}
              disabled={isBulkSending}
              className="inline-flex items-center px-4 py-2 border border-purple-600 rounded-md shadow-sm text-sm font-medium text-purple-600 bg-white hover:bg-purple-50 disabled:opacity-50"
            >
              {isBulkSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {isBulkSending ? "Sending..." : `Send All (${generatedCount})`}
            </button>
          )}
          {sentCount > 0 && (
            <button
              onClick={() => setEmailModalMode("resend")}
              disabled={isResending}
              className="inline-flex items-center px-4 py-2 border border-orange-500 rounded-md shadow-sm text-sm font-medium text-orange-600 bg-white hover:bg-orange-50 disabled:opacity-50"
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {isResending ? "Resending..." : `Resend All (${sentCount})`}
            </button>
          )}
          <Link
            href="/au-rubber/portal/au-cocs/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Certificate
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Draft</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{draftCount}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Generated</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{generatedCount}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Sent</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{sentCount}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Auto-generated</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">{autoGeneratedCount}</div>
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
              placeholder="CoC number, customer, PO, DN ref"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AuCocStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="GENERATED">Generated</option>
              <option value="SENT">Sent</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select
              value={pageSize === "all" ? "all" : String(pageSize)}
              onChange={(e) => {
                const val = e.target.value;
                setPageSize(val === "all" ? "all" : Number(val));
                setCurrentPage(0);
              }}
              className="block w-24 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="all">All</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState
            message="Loading certificates..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        ) : filteredCocs.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.document />}
            title="No certificates found"
            subtitle={
              searchQuery || filterStatus
                ? "Try adjusting your filters"
                : "Get started by creating a certificate"
            }
            action={
              !searchQuery && !filterStatus
                ? {
                    label: "New Certificate",
                    onClick: () => (window.location.href = "/au-rubber/portal/au-cocs/new"),
                    className: "text-white bg-yellow-600 hover:bg-yellow-700",
                  }
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
                  onClick={() => handleSort("customerCompanyName")}
                >
                  Customer
                  <SortIcon
                    active={sortColumn === "customerCompanyName"}
                    direction={sortDirection}
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("poNumber")}
                >
                  PO Number
                  <SortIcon active={sortColumn === "poNumber"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("deliveryNoteRef")}
                >
                  DN Ref
                  <SortIcon active={sortColumn === "deliveryNoteRef"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("rolls")}
                >
                  Rolls
                  <SortIcon active={sortColumn === "rolls"} direction={sortDirection} />
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
              {paginatedCocs.map((coc) => {
                const rawCocCustomerCompanyName = coc.customerCompanyName;
                const rawCocPoNumber = coc.poNumber;
                const rawCocDeliveryNoteRef = coc.deliveryNoteRef;
                const rawCocItemCount = coc.itemCount;
                return (
                  <tr
                    key={coc.id}
                    onClick={() => router.push(`/au-rubber/portal/au-cocs/${coc.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/au-rubber/portal/au-cocs/${coc.id}`}
                        className="text-yellow-600 hover:text-yellow-800 font-medium"
                      >
                        {coc.cocNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rawCocCustomerCompanyName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rawCocPoNumber || "-"}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      onClick={(e) => coc.sourceDeliveryNoteId && e.stopPropagation()}
                    >
                      {coc.sourceDeliveryNoteId ? (
                        <button
                          onClick={() =>
                            window.open(
                              `/au-rubber/portal/delivery-notes/${coc.sourceDeliveryNoteId}`,
                              `dn-${coc.sourceDeliveryNoteId}`,
                              "width=1200,height=800,scrollbars=yes,resizable=yes",
                            )
                          }
                          className="text-yellow-600 hover:text-yellow-800 hover:underline"
                        >
                          {rawCocDeliveryNoteRef || coc.sourceDeliveryNoteId}
                        </button>
                      ) : (
                        rawCocDeliveryNoteRef || "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rawCocItemCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {statusBadge(coc.status)}
                      {readinessBadge(coc)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateZA(coc.createdAt)}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/au-rubber/portal/au-cocs/${coc.id}`}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        View
                      </Link>
                      {coc.status === "DRAFT" && (
                        <button
                          onClick={() => handleGeneratePdf(coc.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Generate PDF
                        </button>
                      )}
                      {(coc.status === "GENERATED" ||
                        (coc.status === "SENT" && coc.generatedPdfPath)) && (
                        <>
                          <button
                            onClick={() => handlePreview(coc)}
                            disabled={previewingId === coc.id}
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            title="View PDF in browser"
                          >
                            {previewingId === coc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDownload(coc)}
                            disabled={downloadingId === coc.id}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {downloadingId === coc.id ? "Downloading..." : "Download"}
                          </button>
                        </>
                      )}
                      {coc.status === "GENERATED" && (
                        <button
                          onClick={() => {
                            setSendingId(coc.id);
                            setShowSendModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          Send
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setDeletingId(coc.id);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {pageSize !== "all" && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCocs.length}
            itemsPerPage={pageSize}
            itemName="certificates"
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {showSendModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-md"
            onClick={() => setShowSendModal(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Send Certificate</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">To</label>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CC</label>
                <input
                  type="text"
                  value={sendCc}
                  onChange={(e) => setSendCc(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  placeholder="cc@example.com (comma-separated)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">BCC</label>
                <input
                  type="text"
                  value={sendBcc}
                  onChange={(e) => setSendBcc(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  placeholder="bcc@example.com (comma-separated)"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || !sendEmail}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailModalMode !== null && (
        <CocEmailModal
          mode={emailModalMode}
          cocs={cocs}
          onClose={() => setEmailModalMode(null)}
          onSend={handleEmailModalSend}
          isSending={isBulkSending || isResending}
        />
      )}

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />

      {progressModal.visible && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/10 backdrop-blur-md" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{progressModal.title}</h3>
              <div className="space-y-4">
                {progressModal.status === "running" && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-6 h-6 text-yellow-600 animate-spin flex-shrink-0" />
                      <p className="text-sm text-gray-600">{progressModal.message}</p>
                    </div>
                    {progressModal.total != null && progressModal.current != null && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{progressModal.currentLabel}</span>
                          <span>
                            {progressModal.current} / {progressModal.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-yellow-500 h-2.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${(progressModal.current / progressModal.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {progressModal.status === "done" && (
                  <div className="flex items-start space-x-3">
                    <svg
                      className="w-6 h-6 text-green-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">{progressModal.message}</p>
                  </div>
                )}
                {progressModal.status === "error" && (
                  <div className="flex items-start space-x-3">
                    <svg
                      className="w-6 h-6 text-red-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">{progressModal.message}</p>
                  </div>
                )}
              </div>
              {progressModal.status !== "running" && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() =>
                      setProgressModal({
                        visible: false,
                        title: "",
                        status: "running",
                        message: "",
                      })
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Certificate</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this certificate? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
