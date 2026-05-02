"use client";

import {
  ArrowLeftRight,
  CheckCircle,
  Eye,
  FileText,
  LineChart,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Pagination,
  SortDirection,
  SortIcon,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import { toastError } from "@/app/lib/api/apiError";
import type {
  CocProcessingStatus,
  RubberSupplierCocDto,
  SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useAuRubberAnalyzeSupplierCocs,
  useAuRubberApproveSupplierCoc,
  useAuRubberAuthorizeVersion,
  useAuRubberCompanies,
  useAuRubberCreateCocsFromAnalysis,
  useAuRubberDeleteSupplierCoc,
  useAuRubberDocumentUrl,
  useAuRubberExtractSupplierCoc,
  useAuRubberProxyImageBlob,
  useAuRubberRejectVersion,
  useAuRubberSupplierCocs,
  useAuRubberUpdateSupplierCoc,
  useAuRubberUploadSupplierCoc,
  useAuRubberUploadSupplierCocWithFiles,
} from "@/app/lib/query/hooks";
import { Breadcrumb } from "../../components/Breadcrumb";
import { FileDropZone } from "../../components/FileDropZone";

const ITEMS_PER_PAGE = 25;

interface AnalyzedFileResult {
  filename: string;
  isGraph: boolean;
  cocType: SupplierCocType | null;
  companyId: number | null;
  companyName: string | null;
  batchNumbers: string[];
  linkedToIndex: number | null;
  compoundCode: string | null;
  extractedData: Record<string, unknown> | null;
}

interface AnalysisResult {
  files: AnalyzedFileResult[];
  dataPdfs: number[];
  graphPdfs: number[];
}

type SortColumn =
  | "id"
  | "productionDate"
  | "cocNumber"
  | "compoundCode"
  | "processingStatus"
  | "createdAt";

export default function SupplierCocsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAdmin } = useAuRubberAuth();
  const { colors, branding } = useAuRubberBranding();
  const logoProxy = useAuRubberProxyImageBlob(branding.logoUrl);
  const logoObjectUrl = logoProxy.objectUrl;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<CocProcessingStatus | "">("");
  const [showAllVersions, setShowAllVersions] = useState(false);
  const cocsQuery = useAuRubberSupplierCocs({
    processingStatus: filterStatus || undefined,
    includeAllVersions: showAllVersions || undefined,
  });
  const companiesQuery = useAuRubberCompanies();
  const rawCocsQueryData = cocsQuery.data;
  const rawCompaniesQueryData = companiesQuery.data;
  const analyzeSupplierCocsMutation = useAuRubberAnalyzeSupplierCocs();
  const createCocsFromAnalysisMutation = useAuRubberCreateCocsFromAnalysis();
  const uploadSupplierCocWithFilesMutation = useAuRubberUploadSupplierCocWithFiles();
  const uploadSupplierCocMutation = useAuRubberUploadSupplierCoc();
  const deleteSupplierCocMutation = useAuRubberDeleteSupplierCoc();
  const extractSupplierCocMutation = useAuRubberExtractSupplierCoc();
  const approveSupplierCocMutation = useAuRubberApproveSupplierCoc();
  const updateSupplierCocMutation = useAuRubberUpdateSupplierCoc();
  const authorizeVersionMutation = useAuRubberAuthorizeVersion();
  const rejectVersionMutation = useAuRubberRejectVersion();
  const documentUrlMutation = useAuRubberDocumentUrl();
  const cocs = rawCocsQueryData || [];
  const companies = rawCompaniesQueryData || [];
  const isLoading = cocsQuery.isLoading;
  const error = cocsQuery.error;
  const [compounderPage, setCompounderPage] = useState(0);
  const [compounderPageSize, setCompounderPageSize] = usePersistedState<number>(
    "auRubber.supplierCocs.compounderPageSize",
    ITEMS_PER_PAGE,
  );
  const [calendererPage, setCalendererPage] = useState(0);
  const [calendererPageSize, setCalendererPageSize] = usePersistedState<number>(
    "auRubber.supplierCocs.calendererPageSize",
    ITEMS_PER_PAGE,
  );
  const [calenderRollPage, setCalenderRollPage] = useState(0);
  const [calenderRollPageSize, setCalenderRollPageSize] = usePersistedState<number>(
    "auRubber.supplierCocs.calenderRollPageSize",
    ITEMS_PER_PAGE,
  );
  const [compounderSort, setCompounderSort] = useState<{
    column: SortColumn;
    direction: SortDirection;
  }>({ column: "productionDate", direction: "desc" });
  const [calendererSort, setCalendererSort] = useState<{
    column: SortColumn;
    direction: SortDirection;
  }>({ column: "productionDate", direction: "desc" });
  const [calenderRollSort, setCalenderRollSort] = useState<{
    column: SortColumn;
    direction: SortDirection;
  }>({ column: "productionDate", direction: "desc" });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<SupplierCocType>("COMPOUNDER");
  const [uploadSupplierId, setUploadSupplierId] = useState<number | null>(null);
  const [uploadCocNumber, setUploadCocNumber] = useState("");
  const [uploadCompoundCode, setUploadCompoundCode] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisDots, setAnalysisDots] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reclassifyTarget, setReclassifyTarget] = useState<{
    id: number;
    cocNumber: string | null;
    currentType: SupplierCocType;
  } | null>(null);
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reextractingId, setReextractingId] = useState<number | null>(null);
  const [selectedForApproval, setSelectedForApproval] = useState<Set<number>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const supplierForType = (type: SupplierCocType): number | null => {
    const supplierNames: Record<SupplierCocType, string[]> = {
      COMPOUNDER: ["S&N Rubber", "S&N", "SN Rubber"],
      CALENDARER: ["Impilo", "Impilo Rubber"],
      CALENDER_ROLL: ["S&N Rubber", "S&N", "SN Rubber"],
    };
    const matchNames = supplierNames[type];
    const match = companies.find((c) =>
      matchNames.some((name) => c.name.toLowerCase().includes(name.toLowerCase())),
    );
    return match ? match.id : null;
  };

  useEffect(() => {
    if (companies.length > 0) {
      const autoSupplier = supplierForType(uploadType);
      if (autoSupplier) {
        setUploadSupplierId(autoSupplier);
      }
    }
  }, [uploadType, companies]);

  const handleSort = (
    section: "compounder" | "calenderer" | "calenderRoll",
    column: SortColumn,
  ) => {
    const sortMap = {
      compounder: { setter: setCompounderSort, current: compounderSort },
      calenderer: { setter: setCalendererSort, current: calendererSort },
      calenderRoll: { setter: setCalenderRollSort, current: calenderRollSort },
    };
    const { setter, current } = sortMap[section];
    if (current.column === column) {
      setter({ column, direction: current.direction === "asc" ? "desc" : "asc" });
    } else {
      setter({ column, direction: "desc" });
    }
  };

  const sortCocs = (
    cocsToSort: RubberSupplierCocDto[],
    sort: { column: SortColumn; direction: SortDirection },
  ): RubberSupplierCocDto[] => {
    return [...cocsToSort].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      if (sort.column === "id") {
        return direction * (a.id - b.id);
      }
      if (sort.column === "productionDate") {
        const rawAProductionDate = a.productionDate;
        const rawBProductionDate = b.productionDate;
        return direction * (rawAProductionDate || "").localeCompare(rawBProductionDate || "");
      }
      if (sort.column === "cocNumber") {
        const rawACocNumber = a.cocNumber;
        const rawBCocNumber = b.cocNumber;
        return direction * (rawACocNumber || "").localeCompare(rawBCocNumber || "");
      }
      if (sort.column === "compoundCode") {
        const rawACompoundCode = a.compoundCode;
        const rawBCompoundCode = b.compoundCode;
        return direction * (rawACompoundCode || "").localeCompare(rawBCompoundCode || "");
      }
      if (sort.column === "processingStatus") {
        return direction * a.processingStatus.localeCompare(b.processingStatus);
      }
      if (sort.column === "createdAt") {
        return direction * a.createdAt.localeCompare(b.createdAt);
      }
      return 0;
    });
  };

  const baseFiltered = cocs.filter((coc) => {
    const matchesSearch =
      searchQuery === "" ||
      coc.cocNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coc.supplierCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coc.compoundCode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const compounderCocs = sortCocs(
    baseFiltered.filter((c) => c.cocType === "COMPOUNDER"),
    compounderSort,
  );
  const calendererCocs = sortCocs(
    baseFiltered.filter((c) => c.cocType === "CALENDARER"),
    calendererSort,
  );
  const calenderRollCocs = sortCocs(
    baseFiltered.filter((c) => c.cocType === "CALENDER_ROLL"),
    calenderRollSort,
  );

  const effectiveCompounderPageSize =
    compounderPageSize === 0 ? compounderCocs.length : compounderPageSize;
  const paginatedCompounder = compounderCocs.slice(
    compounderPage * effectiveCompounderPageSize,
    (compounderPage + 1) * effectiveCompounderPageSize,
  );
  const effectiveCalendererPageSize =
    calendererPageSize === 0 ? calendererCocs.length : calendererPageSize;
  const paginatedCalenderer = calendererCocs.slice(
    calendererPage * effectiveCalendererPageSize,
    (calendererPage + 1) * effectiveCalendererPageSize,
  );
  const effectiveCalenderRollPageSize =
    calenderRollPageSize === 0 ? calenderRollCocs.length : calenderRollPageSize;
  const paginatedCalenderRoll = calenderRollCocs.slice(
    calenderRollPage * effectiveCalenderRollPageSize,
    (calenderRollPage + 1) * effectiveCalenderRollPageSize,
  );

  const sectionLabel = (typeLabel: string, items: RubberSupplierCocDto[]): string => {
    const uniqueSuppliers = [...new Set(items.map((c) => c.supplierCompanyName).filter(Boolean))];
    if (uniqueSuppliers.length === 1) return `${typeLabel} (${uniqueSuppliers[0]})`;
    if (uniqueSuppliers.length > 1) return `${typeLabel} (${uniqueSuppliers.join(", ")})`;
    return typeLabel;
  };

  useEffect(() => {
    setCompounderPage(0);
    setCalendererPage(0);
    setCalenderRollPage(0);
  }, [
    searchQuery,
    filterStatus,
    showAllVersions,
    compounderPageSize,
    calendererPageSize,
    calenderRollPageSize,
  ]);

  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(() => {
      setAnalysisDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
    }, 500);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    setUploadFiles(files);
    setShowAnalysisModal(true);
    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalysisStatus("Reading PDF documents...");
    setAnalysisResult(null);

    try {
      setAnalysisProgress(30);
      setAnalysisStatus("Extracting text and identifying document types...");

      const result = await analyzeSupplierCocsMutation.mutateAsync(files);

      setAnalysisProgress(80);
      setAnalysisStatus("Matching graphs to batch certificates...");

      await new Promise((resolve) => setTimeout(resolve, 500));

      setAnalysisProgress(100);
      setAnalysisStatus("Analysis complete!");
      setAnalysisResult(result);
      setIsAnalyzing(false);
    } catch (err) {
      toastError(showToast, err, "Failed to analyze files");
      setShowAnalysisModal(false);
      setIsAnalyzing(false);
      setUploadFiles([]);
    }
  };

  const handleCreateFromAnalysis = async () => {
    if (!analysisResult || uploadFiles.length === 0) return;

    try {
      setIsUploading(true);
      const result = await createCocsFromAnalysisMutation.mutateAsync({
        files: uploadFiles,
        analysis: analysisResult,
      });

      showToast(
        `Created ${result.cocIds.length} CoC${result.cocIds.length > 1 ? "s" : ""} successfully`,
        "success",
      );

      setShowAnalysisModal(false);
      setAnalysisResult(null);
      setUploadFiles([]);
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to create CoCs");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      if (uploadFiles.length > 0) {
        await uploadSupplierCocWithFilesMutation.mutateAsync({
          files: uploadFiles,
          data: {
            cocType: uploadType,
            supplierCompanyId: uploadSupplierId || undefined,
            cocNumber: uploadCocNumber || undefined,
            compoundCode: uploadCompoundCode || undefined,
          },
        });
        showToast(
          `${uploadFiles.length} CoC${uploadFiles.length > 1 ? "s" : ""} uploaded`,
          "success",
        );
      } else {
        await uploadSupplierCocMutation.mutateAsync({
          cocType: uploadType,
          supplierCompanyId: uploadSupplierId || undefined,
          cocNumber: uploadCocNumber || undefined,
          compoundCode: uploadCompoundCode || undefined,
        });
        showToast("Supplier CoC created", "success");
      }
      setShowUploadModal(false);
      setUploadSupplierId(null);
      setUploadCocNumber("");
      setUploadCompoundCode("");
      setUploadFiles([]);
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to create CoC");
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

  const COC_TYPE_LABELS: Record<SupplierCocType, string> = {
    COMPOUNDER: "Compounder",
    CALENDARER: "Calenderer",
    CALENDER_ROLL: "Calender Roll",
  };

  const typeBadge = (type: SupplierCocType) => {
    const colors: Record<SupplierCocType, string> = {
      COMPOUNDER: "bg-purple-100 text-purple-800",
      CALENDARER: "bg-indigo-100 text-indigo-800",
      CALENDER_ROLL: "bg-amber-100 text-amber-800",
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[type]}`}
      >
        {type}
      </span>
    );
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteSupplierCocMutation.mutateAsync(deletingId);
      showToast("Supplier CoC deleted successfully", "success");
      setShowDeleteModal(false);
      setDeletingId(null);
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to delete supplier CoC");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReextract = async (id: number) => {
    try {
      setReextractingId(id);
      await extractSupplierCocMutation.mutateAsync(id);
      showToast("Data re-extracted successfully", "success");
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to re-extract data");
    } finally {
      setReextractingId(null);
    }
  };

  const isApprovable = (c: RubberSupplierCocDto): boolean =>
    c.processingStatus === "EXTRACTED" || c.processingStatus === "NEEDS_REVIEW";

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

  const toggleAllApprovalSelection = (pageCocs: RubberSupplierCocDto[]) => {
    const pageApprovable = pageCocs.filter(isApprovable);
    const allSelected = pageApprovable.every((c) => selectedForApproval.has(c.id));
    if (allSelected) {
      setSelectedForApproval((prev) => {
        const next = new Set(prev);
        pageApprovable.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedForApproval((prev) => {
        const next = new Set(prev);
        pageApprovable.forEach((c) => next.add(c.id));
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
          chain.then(() => approveSupplierCocMutation.mutateAsync(id).then(() => undefined)),
        Promise.resolve() as Promise<void>,
      );
      showToast(`Approved ${ids.length} CoC${ids.length > 1 ? "s" : ""} successfully`, "success");
      setSelectedForApproval(new Set());
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to approve CoCs");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleReclassify = async (newType: SupplierCocType) => {
    const target = reclassifyTarget;
    if (!target) return;
    if (target.currentType === newType) return;
    const newTypeLabel = COC_TYPE_LABELS[newType];
    const targetCocNumber = target.cocNumber;
    const targetLabel = targetCocNumber ? targetCocNumber : `CoC #${target.id}`;
    try {
      setIsReclassifying(true);
      await updateSupplierCocMutation.mutateAsync({
        id: target.id,
        data: { cocType: newType },
      });
      showToast(`Reclassified ${targetLabel} to ${newTypeLabel}`, "success");
      setReclassifyTarget(null);
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to reclassify CoC");
    } finally {
      setIsReclassifying(false);
    }
  };

  const handleAuthorizeVersion = async (id: number) => {
    try {
      await authorizeVersionMutation.mutateAsync({ kind: "supplier-cocs", id });
      showToast("Version authorized successfully", "success");
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to authorize version");
    }
  };

  const handleRejectVersion = async (id: number) => {
    try {
      await rejectVersionMutation.mutateAsync({ kind: "supplier-cocs", id });
      showToast("Version rejected", "success");
      cocsQuery.refetch();
    } catch (err) {
      toastError(showToast, err, "Failed to reject version");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => cocsQuery.refetch()}
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
        <div className="flex items-center space-x-3">
          {selectedForApproval.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isBulkApproving
                ? "Approving..."
                : `Approve ${selectedForApproval.size} CoC${selectedForApproval.size > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg hover:bg-yellow-100 hover:border-yellow-400 transition-colors"
      >
        <div className="flex items-center justify-center py-6 px-4">
          <svg
            className="w-8 h-8 text-yellow-500 mr-3"
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
          <span className="text-yellow-700 font-medium">
            Drag and drop CoC files here, or click to browse
          </span>
        </div>
      </FileDropZone>

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
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllVersions}
              onChange={(e) => setShowAllVersions(e.target.checked)}
              className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
            <span className="text-sm font-medium text-gray-700">Show All Versions</span>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <TableLoadingState
            message="Loading supplier CoCs..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        </div>
      ) : (
        [
          {
            label: sectionLabel("Compounder", compounderCocs),
            badge: "bg-purple-100 text-purple-800",
            section: "compounder" as const,
            items: compounderCocs,
            paginated: paginatedCompounder,
            page: compounderPage,
            setPage: setCompounderPage,
            sort: compounderSort,
            pageSize: compounderPageSize,
            setPageSize: setCompounderPageSize,
          },
          {
            label: sectionLabel("Calenderer", calendererCocs),
            badge: "bg-indigo-100 text-indigo-800",
            section: "calenderer" as const,
            items: calendererCocs,
            paginated: paginatedCalenderer,
            page: calendererPage,
            setPage: setCalendererPage,
            sort: calendererSort,
            pageSize: calendererPageSize,
            setPageSize: setCalendererPageSize,
          },
          {
            label: sectionLabel("Calender Roll", calenderRollCocs),
            badge: "bg-amber-100 text-amber-800",
            section: "calenderRoll" as const,
            items: calenderRollCocs,
            paginated: paginatedCalenderRoll,
            page: calenderRollPage,
            setPage: setCalenderRollPage,
            sort: calenderRollSort,
            pageSize: calenderRollPageSize,
            setPageSize: setCalenderRollPageSize,
          },
        ].map((group) => {
          const hasApprovable = group.items.some(isApprovable);
          return (
            <div key={group.section} className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${group.badge}`}>
                    {group.items.length}
                  </span>
                </div>
              </div>
              {group.items.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">
                    {searchQuery || filterStatus ? "No matching CoCs" : "No CoCs uploaded yet"}
                  </p>
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
                              group.paginated.filter(isApprovable).length > 0 &&
                              group.paginated
                                .filter(isApprovable)
                                .every((c) => selectedForApproval.has(c.id))
                            }
                            onChange={() => toggleAllApprovalSelection(group.paginated)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(group.section, "id")}
                      >
                        System #
                        <SortIcon
                          active={group.sort.column === "id"}
                          direction={group.sort.direction}
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(group.section, "productionDate")}
                      >
                        Doc Date
                        <SortIcon
                          active={group.sort.column === "productionDate"}
                          direction={group.sort.direction}
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(group.section, "processingStatus")}
                      >
                        Status
                        <SortIcon
                          active={group.sort.column === "processingStatus"}
                          direction={group.sort.direction}
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(group.section, "cocNumber")}
                      >
                        CoC Number
                        <SortIcon
                          active={group.sort.column === "cocNumber"}
                          direction={group.sort.direction}
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(group.section, "compoundCode")}
                      >
                        Compound
                        <SortIcon
                          active={group.sort.column === "compoundCode"}
                          direction={group.sort.direction}
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Supplier
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(group.section, "createdAt")}
                      >
                        Uploaded
                        <SortIcon
                          active={group.sort.column === "createdAt"}
                          direction={group.sort.direction}
                        />
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.paginated.map((coc) => {
                      const rawCocCocNumber = coc.cocNumber;
                      const rawCocCompoundCode = coc.compoundCode;
                      const rawCocSupplierCompanyName = coc.supplierCompanyName;
                      const isInactive =
                        coc.versionStatus === "SUPERSEDED" || coc.versionStatus === "REJECTED";
                      const isPendingAuth = coc.versionStatus === "PENDING_AUTHORIZATION";
                      return (
                        <tr
                          key={coc.id}
                          onClick={() => router.push(`/au-rubber/portal/supplier-cocs/${coc.id}`)}
                          className={`hover:bg-gray-50 cursor-pointer ${isInactive ? "opacity-40" : ""}`}
                        >
                          {hasApprovable && (
                            <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                              {isApprovable(coc) && (
                                <input
                                  type="checkbox"
                                  checked={selectedForApproval.has(coc.id)}
                                  onChange={() => toggleApprovalSelection(coc.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                            #{coc.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {coc.productionDate ? formatDateZA(coc.productionDate) : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {statusBadge(coc.processingStatus)}
                          </td>
                          <td className="px-6 py-4 break-words">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/au-rubber/portal/supplier-cocs/${coc.id}`}
                                className="text-yellow-600 hover:text-yellow-800 font-medium break-words"
                              >
                                {rawCocCocNumber || `COC-${coc.id}`}
                              </Link>
                              {coc.version > 1 && (
                                <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                  v{coc.version}
                                </span>
                              )}
                              {isPendingAuth && (
                                <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                                  Awaiting Authorization
                                </span>
                              )}
                            </div>
                            {coc.rejectedRollNumbers.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {coc.rejectedRollNumbers.map((rn) => (
                                  <span
                                    key={rn}
                                    className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-50 text-red-600 line-through"
                                    title="Rejected roll"
                                  >
                                    {rn}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {rawCocCompoundCode || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {rawCocSupplierCompanyName || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateZA(coc.createdAt)}
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isPendingAuth && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAuthorizeVersion(coc.id)}
                                  className="text-green-600 hover:text-green-800 font-medium"
                                >
                                  Authorize
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectVersion(coc.id)}
                                  className="text-amber-600 hover:text-amber-800 font-medium"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {coc.graphPdfPath && (
                              <button
                                onClick={async () => {
                                  const graphPath = coc.graphPdfPath;
                                  if (!graphPath) return;
                                  const url = await documentUrlMutation.mutateAsync(graphPath);
                                  window.open(url, "_blank");
                                }}
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                                title="View Rheometer Graph"
                              >
                                <LineChart className="w-4 h-4" />
                              </button>
                            )}
                            <Link
                              href={`/au-rubber/portal/supplier-cocs/${coc.id}`}
                              className="text-yellow-600 hover:text-yellow-800 inline-flex items-center"
                              title="View CoC"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleReextract(coc.id)}
                              disabled={reextractingId === coc.id}
                              className="text-green-600 hover:text-green-800 inline-flex items-center disabled:opacity-50"
                              title="Re-extract data"
                            >
                              <RefreshCw
                                className={`w-4 h-4 ${reextractingId === coc.id ? "animate-spin" : ""}`}
                              />
                            </button>
                            <button
                              onClick={() =>
                                setReclassifyTarget({
                                  id: coc.id,
                                  cocNumber: coc.cocNumber,
                                  currentType: coc.cocType,
                                })
                              }
                              className="text-purple-600 hover:text-purple-800 inline-flex items-center"
                              title="Reclassify CoC type"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setDeletingId(coc.id);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600 hover:text-red-800 inline-flex items-center"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <Pagination
                currentPage={group.page}
                totalItems={group.items.length}
                itemsPerPage={group.pageSize}
                itemName="CoCs"
                onPageChange={group.setPage}
                onPageSizeChange={group.setPageSize}
              />
            </div>
          );
        })
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowUploadModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Supplier CoC</h3>
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
                    onChange={(e) => setUploadType(e.target.value as SupplierCocType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="COMPOUNDER">Compounder</option>
                    <option value="CALENDARER">Calenderer</option>
                    <option value="CALENDER_ROLL">Calender Roll</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <select
                    value={uploadSupplierId || ""}
                    onChange={(e) =>
                      setUploadSupplierId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="">Select supplier...</option>
                    {companies
                      .filter((c) => c.companyType === "SUPPLIER")
                      .map((c) => (
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
                  disabled={isUploading}
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

      {showAnalysisModal && (
        <div className="fixed inset-x-0 top-16 bottom-16 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="relative bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div
              className="px-4 py-3 flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.background }}
            >
              {logoObjectUrl ? (
                <img src={logoObjectUrl} alt="Logo" className="h-10 max-w-[180px] object-contain" />
              ) : (
                <div className="flex items-center">
                  <span className="text-2xl font-bold" style={{ color: colors.accent }}>
                    AU
                  </span>
                  <span className="ml-2 text-white text-lg font-medium">Rubber</span>
                </div>
              )}
            </div>

            <div className="px-6 py-6">
              {isAnalyzing ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-16 h-16 flex-shrink-0 rounded-full flex items-center justify-center shadow-lg relative"
                      style={{ backgroundColor: colors.background }}
                    >
                      <svg
                        className="w-8 h-8 text-white animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>

                    <div className="flex-1 text-left">
                      <h2 className="text-lg font-bold text-gray-900">
                        Analyzing Your Documents{analysisDots}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">{analysisStatus}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${analysisProgress}%`,
                          background: `linear-gradient(90deg, ${colors.accent} 0%, ${colors.background} 50%, ${colors.accent} 100%)`,
                          backgroundSize: "200% 100%",
                          animation: "shimmer 2s infinite linear",
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">
                        {Math.round(analysisProgress)}% complete
                      </span>
                      <span className="text-gray-500">Analyzing {uploadFiles.length} files</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Extracting certificate data and batch numbers...</span>
                  </div>
                </>
              ) : analysisResult ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-16 h-16 flex-shrink-0 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: "#22c55e" }}
                    >
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>

                    <div className="flex-1 text-left">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Analysis Complete
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Found {analysisResult.dataPdfs.length} certificate
                        {analysisResult.dataPdfs.length !== 1 ? "s" : ""} and{" "}
                        {analysisResult.graphPdfs.length} graph
                        {analysisResult.graphPdfs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {analysisResult.files.map((file, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          file.isGraph
                            ? "bg-blue-50 border-blue-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {file.isGraph ? (
                              <LineChart className="w-4 h-4 text-blue-600" />
                            ) : (
                              <FileText className="w-4 h-4 text-green-600" />
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {file.filename}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              file.isGraph
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {file.isGraph ? "Graph" : "Certificate"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          {file.cocType && <span className="mr-3">Type: {file.cocType}</span>}
                          {file.companyName && (
                            <span className="mr-3">Supplier: {file.companyName}</span>
                          )}
                          {file.compoundCode && <span>Compound: {file.compoundCode}</span>}
                          {file.isGraph && file.linkedToIndex !== null && (
                            <span className="text-blue-600">
                              → Linked to: {analysisResult.files[file.linkedToIndex]?.filename}
                            </span>
                          )}
                          {file.batchNumbers.length > 0 && (
                            <div className="mt-1">
                              Batches: {file.batchNumbers.slice(0, 5).join(", ")}
                              {file.batchNumbers.length > 5 &&
                                ` +${file.batchNumbers.length - 5} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAnalysisModal(false);
                        setAnalysisResult(null);
                        setUploadFiles([]);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateFromAnalysis}
                      disabled={isUploading}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isUploading
                        ? "Creating..."
                        : `Create ${analysisResult.dataPdfs.length} CoC${analysisResult.dataPdfs.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="h-1 flex-shrink-0" style={{ backgroundColor: colors.accent }} />
          </div>

          <style jsx>{`
            @keyframes shimmer {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          `}</style>
        </div>
      )}

      {(() => {
        if (!reclassifyTarget) return null;
        const docRef = globalThis.document;
        if (!docRef) return null;
        const targetCocNumber = reclassifyTarget.cocNumber;
        const targetId = reclassifyTarget.id;
        const targetCurrentType = reclassifyTarget.currentType;
        const targetLabel = targetCocNumber ? targetCocNumber : `CoC #${targetId}`;
        const currentTypeLabel = COC_TYPE_LABELS[targetCurrentType];
        return createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => !isReclassifying && setReclassifyTarget(null)}
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Reclassify CoC</h3>
              <p className="text-sm text-gray-600 mb-4">
                {targetLabel} is currently classified as <strong>{currentTypeLabel}</strong>. Choose
                the correct type — the CoC will move to the matching section.
              </p>
              <div className="space-y-2">
                {(["COMPOUNDER", "CALENDARER", "CALENDER_ROLL"] as SupplierCocType[]).map(
                  (type) => {
                    const isCurrent = type === targetCurrentType;
                    const label = COC_TYPE_LABELS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => handleReclassify(type)}
                        disabled={isCurrent || isReclassifying}
                        className={`w-full text-left px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                          isCurrent
                            ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                            : "border-purple-300 text-purple-700 bg-white hover:bg-purple-50 disabled:opacity-50"
                        }`}
                      >
                        {isCurrent ? `${label} (current)` : `Move to ${label}`}
                      </button>
                    );
                  },
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setReclassifyTarget(null)}
                  disabled={isReclassifying}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          docRef.body,
        );
      })()}

      {showDeleteModal &&
        globalThis.document &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowDeleteModal(false)}
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Supplier CoC</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this supplier CoC? This action cannot be undone.
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
          </div>,
          globalThis.document.body,
        )}
    </div>
  );
}
