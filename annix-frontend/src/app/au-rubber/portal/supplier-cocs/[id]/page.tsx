"use client";

import { useQueryClient } from "@tanstack/react-query";
import { isArray, isNumber, keys, values } from "es-toolkit/compat";
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  FileWarning,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { RollRejectionsPanel } from "@/app/au-rubber/components/RollRejectionsPanel";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { toastError } from "@/app/lib/api/apiError";
import {
  auRubberApiClient,
  type CocProcessingStatus,
  type RubberCompoundBatchDto,
  type RubberSupplierCocDto,
  type SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";
import {
  useAuRubberApproveSupplierCoc,
  useAuRubberAuthorizeVersion,
  useAuRubberRejectVersion,
} from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys/rubberKeys";

interface ExtractedBatch {
  batchNumber: string;
  shoreA?: number;
  specificGravity?: number;
  reboundPercent?: number;
  tearStrengthKnM?: number;
  tensileStrengthMpa?: number;
  elongationPercent?: number;
  rheometerSMin?: number;
  rheometerSMax?: number;
  rheometerTs2?: number;
  rheometerTc90?: number;
  passFailStatus?: string;
}

interface ExtractedSpecs {
  shoreAMin?: number | null;
  shoreAMax?: number | null;
  specificGravityMin?: number | null;
  specificGravityMax?: number | null;
  tensileMin?: number | null;
  tensileMax?: number | null;
  elongationMin?: number | null;
  elongationMax?: number | null;
  tearStrengthMin?: number | null;
  tearStrengthMax?: number | null;
  reboundMin?: number | null;
  reboundMax?: number | null;
}

export default function SupplierCocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();
  const { isAdmin } = useAuRubberAuth();
  const authorizeVersionMutation = useAuRubberAuthorizeVersion();
  const rejectVersionMutation = useAuRubberRejectVersion();
  const approveSupplierCocMutation = useAuRubberApproveSupplierCoc();
  const queryClient = useQueryClient();
  const [coc, setCoc] = useState<RubberSupplierCocDto | null>(null);
  const [batches, setBatches] = useState<RubberCompoundBatchDto[]>([]);
  const [siblingCocs, setSiblingCocs] = useState<RubberSupplierCocDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    cocType: "" as SupplierCocType | "",
    cocNumber: "",
    compoundCode: "",
    productionDate: "",
    orderNumber: "",
    ticketNumber: "",
    createdAt: "",
  });
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [editBatchFields, setEditBatchFields] = useState<Record<string, string>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentMissing, setDocumentMissing] = useState(false);
  const [isEditingExtracted, setIsEditingExtracted] = useState(false);
  const [editedBatches, setEditedBatches] = useState<ExtractedBatch[]>([]);
  const [editedExtractedFields, setEditedExtractedFields] = useState<Record<string, string>>({});
  const [isSavingExtracted, setIsSavingExtracted] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percent = Math.max(20, Math.min(80, (x / rect.width) * 100));
      setSplitPercent(percent);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const cocId = Number(params.id);

  const documentExtension = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return ext;
  };

  const isOfficeFile = (path: string): boolean => {
    const ext = documentExtension(path);
    return ["xlsx", "xls", "docx", "doc", "pptx", "ppt"].includes(ext);
  };

  const officeViewerUrl = (url: string): string =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cocData, batchesData, siblingsData] = await Promise.all([
        auRubberApiClient.supplierCocById(cocId),
        auRubberApiClient.compoundBatchesByCocId(cocId),
        auRubberApiClient.siblingSupplierCocs(cocId),
      ]);
      setCoc(cocData);
      setBatches(isArray(batchesData) ? batchesData : []);
      setSiblingCocs(isArray(siblingsData) ? siblingsData : []);

      if (cocData.documentPath) {
        const url = await auRubberApiClient.documentUrl(cocData.documentPath);
        setDocumentUrl(url);
        setDocumentMissing(url === null);
      } else {
        setDocumentUrl(null);
        setDocumentMissing(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cocId) {
      fetchData();
    }
  }, [cocId]);

  const handleExtract = async () => {
    if (coc?.processingStatus === "APPROVED") {
      const confirmed = await confirm({
        title: "Re-extract approved CoC?",
        message:
          "This CoC is APPROVED. Re-extracting will delete the existing persisted batches and recreate them from the new extraction.\n\nAny manual corrections previously made to those batches will be lost.",
        confirmLabel: "Re-extract",
        cancelLabel: "Cancel",
        variant: "warning",
      });
      if (!confirmed) return;
    }
    try {
      setIsExtracting(true);
      showExtraction({
        brand: "au-rubber",
        label: "Extracting supplier CoC…",
        estimatedDurationMs: 60000,
      });
      await auRubberApiClient.extractSupplierCoc(cocId);
      showToast("Data extracted successfully", "success");
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to extract data");
    } finally {
      hideExtraction();
      setIsExtracting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await approveSupplierCocMutation.mutateAsync(cocId);
      await queryClient.refetchQueries({ queryKey: rubberKeys.supplierCocs.all });
      showToast("CoC approved", "success");
      router.replace("/au-rubber/portal/supplier-cocs");
    } catch (err) {
      toastError(showToast, err, "Failed to approve CoC");
      setIsApproving(false);
    }
  };

  const handleAuthorizeVersion = async () => {
    try {
      await authorizeVersionMutation.mutateAsync({ kind: "supplier-cocs", id: cocId });
      await queryClient.refetchQueries({ queryKey: rubberKeys.supplierCocs.all });
      showToast("Version authorized — previous version superseded", "success");
      router.replace("/au-rubber/portal/supplier-cocs");
    } catch (err) {
      toastError(showToast, err, "Failed to authorize version");
    }
  };

  const handleRejectVersion = async () => {
    const confirmed = await confirm({
      title: "Reject this version?",
      message:
        "Rejecting this re-uploaded version will mark it as rejected. The previous version will remain the active one. This cannot be undone.",
      confirmLabel: "Reject",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await rejectVersionMutation.mutateAsync({ kind: "supplier-cocs", id: cocId });
      await queryClient.refetchQueries({ queryKey: rubberKeys.supplierCocs.all });
      showToast("Version rejected", "success");
      router.replace("/au-rubber/portal/supplier-cocs");
    } catch (err) {
      toastError(showToast, err, "Failed to reject version");
    }
  };

  const startEditing = () => {
    if (!coc) return;
    const rawCocCocNumber = coc.cocNumber;
    const rawCocCompoundCode = coc.compoundCode;
    const rawCocOrderNumber = coc.orderNumber;
    const rawCocTicketNumber = coc.ticketNumber;
    setEditFields({
      cocType: coc.cocType,
      cocNumber: rawCocCocNumber || "",
      compoundCode: rawCocCompoundCode || "",
      productionDate: coc.productionDate ? coc.productionDate.split("T")[0] : "",
      orderNumber: rawCocOrderNumber || "",
      ticketNumber: rawCocTicketNumber || "",
      createdAt: coc.createdAt ? coc.createdAt.split("T")[0] : "",
    });
    setIsEditing(true);
  };

  const handleSaveDetails = async () => {
    if (!coc) return;
    try {
      const rawEditFieldsCocType = editFields.cocType;
      const rawEditFieldsCocNumber = editFields.cocNumber;
      const rawEditFieldsCompoundCode = editFields.compoundCode;
      const rawEditFieldsProductionDate = editFields.productionDate;
      const rawEditFieldsOrderNumber = editFields.orderNumber;
      const rawEditFieldsTicketNumber = editFields.ticketNumber;
      const rawEditFieldsCreatedAt = editFields.createdAt;
      setIsSaving(true);
      await auRubberApiClient.updateSupplierCoc(cocId, {
        cocType: rawEditFieldsCocType || undefined,
        cocNumber: rawEditFieldsCocNumber || null,
        compoundCode: rawEditFieldsCompoundCode || null,
        productionDate: rawEditFieldsProductionDate || null,
        orderNumber: rawEditFieldsOrderNumber || null,
        ticketNumber: rawEditFieldsTicketNumber || null,
        createdAt: rawEditFieldsCreatedAt || null,
      });
      showToast("CoC details updated", "success");
      setIsEditing(false);
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to update CoC");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingBatch = (batch: RubberCompoundBatchDto) => {
    const rawBatchBatchNumber = batch.batchNumber;
    setEditingBatchId(batch.id);
    setEditBatchFields({
      batchNumber: rawBatchBatchNumber || "",
      shoreAHardness: batch.shoreAHardness != null ? String(batch.shoreAHardness) : "",
      specificGravity: batch.specificGravity != null ? String(batch.specificGravity) : "",
      tensileStrengthMpa: batch.tensileStrengthMpa != null ? String(batch.tensileStrengthMpa) : "",
      elongationPercent: batch.elongationPercent != null ? String(batch.elongationPercent) : "",
      tearStrengthKnM: batch.tearStrengthKnM != null ? String(batch.tearStrengthKnM) : "",
      reboundPercent: batch.reboundPercent != null ? String(batch.reboundPercent) : "",
    });
  };

  const handleSaveBatch = async () => {
    if (editingBatchId === null) return;
    try {
      const rawEditBatchFieldsBatchNumber = editBatchFields.batchNumber;
      setIsSavingBatch(true);
      const parseNum = (val: string): number | null => (val.trim() === "" ? null : Number(val));
      await auRubberApiClient.updateCompoundBatch(editingBatchId, {
        batchNumber: rawEditBatchFieldsBatchNumber || undefined,
        shoreAHardness: parseNum(editBatchFields.shoreAHardness),
        specificGravity: parseNum(editBatchFields.specificGravity),
        tensileStrengthMpa: parseNum(editBatchFields.tensileStrengthMpa),
        elongationPercent: parseNum(editBatchFields.elongationPercent),
        tearStrengthKnM: parseNum(editBatchFields.tearStrengthKnM),
        reboundPercent: parseNum(editBatchFields.reboundPercent),
      });
      showToast("Batch updated - Nix will learn from this correction", "success");
      setEditingBatchId(null);
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to update batch");
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    try {
      await auRubberApiClient.deleteCompoundBatch(batchId);
      showToast("Batch deleted", "success");
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to delete batch");
    }
  };

  const startEditingExtracted = useCallback(() => {
    const extracted = coc?.extractedData as Record<string, unknown> | null;
    const rawExtractedBatches = extracted?.batches;
    const rawExtractedCompoundCode = extracted?.compoundCode;
    const rawExtractedCocNumber = extracted?.cocNumber;
    const rawExtractedProductionDate = extracted?.productionDate;
    const rawExtractedOrderNumber = extracted?.orderNumber;
    const rawExtractedTicketNumber = extracted?.ticketNumber;
    const rawExtractedCompoundDescription = extracted?.compoundDescription;
    const rawBatches = (rawExtractedBatches || []) as ExtractedBatch[];
    setEditedBatches(rawBatches.map((b) => ({ ...b })));
    const compoundCodeValue = rawExtractedCompoundCode
      ? rawExtractedCompoundCode
      : rawExtractedCompoundDescription || "";
    setEditedExtractedFields({
      compoundCode: String(compoundCodeValue),
      cocNumber: String(rawExtractedCocNumber || ""),
      productionDate: String(rawExtractedProductionDate || ""),
      orderNumber: String(rawExtractedOrderNumber || ""),
      ticketNumber: String(rawExtractedTicketNumber || ""),
    });
    setIsEditingExtracted(true);
  }, [coc]);

  const handleExtractedBatchChange = useCallback(
    (batchIdx: number, field: string, value: string) => {
      setEditedBatches((prev) =>
        prev.map((batch, i) => {
          if (i !== batchIdx) return batch;
          if (field === "batchNumber" || field === "passFailStatus") {
            return { ...batch, [field]: value };
          }
          const numVal = value === "" ? undefined : Number(value);
          return { ...batch, [field]: numVal };
        }),
      );
    },
    [],
  );

  const handleDeleteExtractedBatch = useCallback((batchIdx: number) => {
    setEditedBatches((prev) => prev.filter((_, i) => i !== batchIdx));
  }, []);

  const handleSaveExtracted = useCallback(async () => {
    if (!coc) return;
    try {
      const rawCocExtractedData = coc.extractedData;
      const rawEditedExtractedFieldsCompoundCode = editedExtractedFields.compoundCode;
      const rawEditedExtractedFieldsCocNumber = editedExtractedFields.cocNumber;
      const rawEditedExtractedFieldsProductionDate = editedExtractedFields.productionDate;
      const rawEditedExtractedFieldsOrderNumber = editedExtractedFields.orderNumber;
      const rawEditedExtractedFieldsTicketNumber = editedExtractedFields.ticketNumber;
      setIsSavingExtracted(true);
      const existing = (rawCocExtractedData || {}) as Record<string, unknown>;
      const updatedData = {
        ...existing,
        batches: editedBatches,
        compoundCode: rawEditedExtractedFieldsCompoundCode || null,
        cocNumber: rawEditedExtractedFieldsCocNumber || null,
        productionDate: rawEditedExtractedFieldsProductionDate || null,
        orderNumber: rawEditedExtractedFieldsOrderNumber || null,
        ticketNumber: rawEditedExtractedFieldsTicketNumber || null,
      };
      await auRubberApiClient.reviewSupplierCoc(cocId, { extractedData: updatedData });
      showToast("Extracted data updated", "success");
      setIsEditingExtracted(false);
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to save extracted data");
    } finally {
      setIsSavingExtracted(false);
    }
  }, [coc, cocId, editedBatches, editedExtractedFields, showToast]);

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
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const typeBadge = (type: SupplierCocType) => {
    const colors: Record<SupplierCocType, string> = {
      COMPOUNDER: "bg-purple-100 text-purple-800",
      CALENDARER: "bg-indigo-100 text-indigo-800",
      CALENDER_ROLL: "bg-amber-100 text-amber-800",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[type]}`}
      >
        {type}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
      </div>
    );
  }

  if (error || !coc) {
    const rawErrorMessage = error?.message;
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{rawErrorMessage || "CoC not found"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const rawCocCocNumber2 = coc.cocNumber;
  const rawCocCocNumber3 = coc.cocNumber;
  const rawCocSupplierCompanyName = coc.supplierCompanyName;
  const rawCocCompoundCode2 = coc.compoundCode;
  const rawCocOrderNumber2 = coc.orderNumber;
  const rawCocTicketNumber2 = coc.ticketNumber;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Supplier CoCs", href: "/au-rubber/portal/supplier-cocs" },
          { label: rawCocCocNumber2 || `COC-${coc.id}` },
        ]}
      />

      {coc.versionStatus === "PENDING_AUTHORIZATION" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900">
              Awaiting authorization (version {coc.version})
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              A new version of this CoC has been received from the supplier. Authorize it to
              supersede
              {coc.previousVersionId ? (
                <>
                  {" "}
                  the{" "}
                  <Link
                    href={`/au-rubber/portal/supplier-cocs/${coc.previousVersionId}`}
                    className="underline font-medium"
                  >
                    previous version
                  </Link>
                </>
              ) : (
                " the previous version"
              )}
              , or reject it to keep the existing version active. You can also Re-extract this
              version if the data is wrong; Approve is disabled until the version is authorized.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {rawCocCocNumber3 || `COC-${coc.id}`}
          </h1>
          <div className="mt-2 flex items-center space-x-3">
            {typeBadge(coc.cocType)}
            {statusBadge(coc.processingStatus)}
            {coc.versionStatus === "PENDING_AUTHORIZATION" && (
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                Pending Authorization
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          {coc.versionStatus === "PENDING_AUTHORIZATION" ? (
            (() => {
              const isAuthorizing = authorizeVersionMutation.isPending;
              const isRejecting = rejectVersionMutation.isPending;
              const versionActionPending = isAuthorizing || isRejecting;
              return (
                <>
                  <button
                    onClick={handleExtract}
                    disabled={isExtracting || versionActionPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    title="Re-run AI extraction on this pending version (does not authorize it)"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${isExtracting ? "animate-spin" : ""}`} />
                    {isExtracting ? "Extracting..." : "Re-extract"}
                  </button>
                  <button
                    onClick={handleRejectVersion}
                    disabled={versionActionPending}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    {isRejecting ? "Rejecting..." : "Reject Version"}
                  </button>
                  <button
                    onClick={handleAuthorizeVersion}
                    disabled={versionActionPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    {isAuthorizing ? "Authorizing..." : "Authorize Version"}
                  </button>
                </>
              );
            })()
          ) : (
            <>
              {(coc.processingStatus !== "APPROVED" || isAdmin) && (
                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${isExtracting ? "animate-spin" : ""}`} />
                  {isExtracting
                    ? "Extracting..."
                    : coc.processingStatus === "PENDING"
                      ? "Extract Data"
                      : "Re-extract"}
                </button>
              )}
              {(coc.processingStatus === "EXTRACTED" ||
                coc.processingStatus === "NEEDS_REVIEW") && (
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {isApproving ? "Approving..." : "Approve"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Document</span>
          </div>
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </a>
          )}
        </div>
        <div className="h-[600px] bg-gray-100">
          {documentUrl && coc.documentPath && isOfficeFile(coc.documentPath) ? (
            <iframe
              src={officeViewerUrl(documentUrl)}
              className="w-full h-full"
              title="CoC Document"
            />
          ) : documentUrl ? (
            <iframe src={documentUrl} className="w-full h-full" title="CoC Document" />
          ) : documentMissing ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <FileWarning className="w-12 h-12 text-amber-500 mb-3" />
              <h3 className="text-base font-semibold text-gray-900">
                Document missing from storage
              </h3>
              <p className="mt-2 text-sm text-gray-600 max-w-md">
                The PDF for this CoC is no longer available in storage. Extracted data below is
                preserved. To restore the document, forward the original supplier email again or
                upload the PDF manually.
              </p>
              <p className="mt-3 text-xs text-gray-400 font-mono break-all max-w-md">
                {coc.documentPath}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No document available
            </div>
          )}
        </div>
      </div>

      <div ref={splitContainerRef} className="flex flex-col lg:flex-row gap-0 relative">
        <div
          className="bg-white shadow rounded-lg p-6 overflow-auto"
          style={{ width: `calc(${splitPercent}% - 4px)` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">CoC Details</h2>
            {!isEditing && (coc.processingStatus !== "APPROVED" || isAdmin) && (
              <button
                onClick={startEditing}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">CoC Type</label>
                <select
                  value={editFields.cocType}
                  onChange={(e) =>
                    setEditFields({
                      ...editFields,
                      cocType: e.target.value as SupplierCocType,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                >
                  <option value="COMPOUNDER">Compounder</option>
                  <option value="CALENDARER">Calendered Sheeting</option>
                  <option value="CALENDER_ROLL">Calender Roll</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">CoC Number</label>
                <input
                  type="text"
                  value={editFields.cocNumber}
                  onChange={(e) => setEditFields({ ...editFields, cocNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">CoC Type</label>
                <select
                  value={editFields.cocType}
                  onChange={(e) =>
                    setEditFields({ ...editFields, cocType: e.target.value as SupplierCocType })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                >
                  <option value="COMPOUNDER">Compounder</option>
                  <option value="CALENDARER">Calenderer (Sheeting)</option>
                  <option value="CALENDER_ROLL">Calender Roll</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Compound Code</label>
                <input
                  type="text"
                  value={editFields.compoundCode}
                  onChange={(e) => setEditFields({ ...editFields, compoundCode: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Production Date</label>
                <input
                  type="date"
                  value={editFields.productionDate}
                  onChange={(e) => setEditFields({ ...editFields, productionDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                />
              </div>
              {editFields.cocType === "CALENDARER" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Order Number</label>
                    <input
                      type="text"
                      value={editFields.orderNumber}
                      onChange={(e) =>
                        setEditFields({ ...editFields, orderNumber: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ticket Number</label>
                    <input
                      type="text"
                      value={editFields.ticketNumber}
                      onChange={(e) =>
                        setEditFields({ ...editFields, ticketNumber: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <input
                  type="date"
                  value={editFields.createdAt}
                  onChange={(e) => setEditFields({ ...editFields, createdAt: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                />
              </div>
              <div className="col-span-2 flex space-x-3 pt-2">
                <button
                  onClick={handleSaveDetails}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                <dd className="mt-1 text-sm text-gray-900">{rawCocSupplierCompanyName || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">CoC Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{coc.cocTypeLabel}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Compound Code</dt>
                <dd className="mt-1 text-sm text-gray-900">{rawCocCompoundCode2 || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Production Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {coc.productionDate ? formatDateZA(coc.productionDate) : "-"}
                </dd>
              </div>
              {coc.cocType === "CALENDARER" && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{rawCocOrderNumber2 || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ticket Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{rawCocTicketNumber2 || "-"}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTimeZA(coc.createdAt)}</dd>
              </div>
              {coc.approvedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Approved</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTimeZA(coc.approvedAt)}
                    {coc.approvedBy && (
                      <span className="text-gray-500 ml-1">by {coc.approvedBy}</span>
                    )}
                  </dd>
                </div>
              )}
              {coc.linkedDeliveryNoteId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Linked Delivery Note</dt>
                  <dd className="mt-1 text-sm">
                    <Link
                      href={`/au-rubber/portal/delivery-notes/${coc.linkedDeliveryNoteId}`}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      View Delivery Note
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <div
          onMouseDown={handleDragStart}
          className="hidden lg:flex w-2 cursor-col-resize items-center justify-center group hover:bg-teal-100 rounded transition-colors"
          title="Drag to resize"
        >
          <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-teal-500 rounded-full transition-colors" />
        </div>

        {coc.extractedData && keys(coc.extractedData).length > 0 && (
          <div
            className="bg-white shadow rounded-lg p-6 overflow-auto flex-1"
            style={{ width: `calc(${100 - splitPercent}% - 4px)` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Extracted Data</h2>
              {!isEditingExtracted && (coc.processingStatus !== "APPROVED" || isAdmin) && (
                <button
                  onClick={startEditingExtracted}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </button>
              )}
            </div>

            {(() => {
              const extracted = coc.extractedData as Record<string, unknown>;
              const rawExtractedSpecifications = extracted.specifications;
              const rawExtractedBatches2 = extracted.batches;
              const rawExtractedCompoundCode2 = extracted.compoundCode;
              const specs = (rawExtractedSpecifications || {}) as ExtractedSpecs;
              const rawBatches = isEditingExtracted
                ? editedBatches
                : ((rawExtractedBatches2 || []) as ExtractedBatch[]);

              const editableFields = [
                {
                  label: "Compound",
                  key: "compoundCode",
                  value: rawExtractedCompoundCode2 || extracted.compoundDescription,
                },
                { label: "CoC Number", key: "cocNumber", value: extracted.cocNumber },
                {
                  label: "Production Date",
                  key: "productionDate",
                  value: extracted.productionDate,
                },
                { label: "Order Number", key: "orderNumber", value: extracted.orderNumber },
                { label: "Ticket Number", key: "ticketNumber", value: extracted.ticketNumber },
              ];
              const hasGraphField = extracted.hasGraph
                ? { label: "Has Graph", value: "Yes" }
                : null;

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {editableFields
                      .filter((f) => isEditingExtracted || f.value)
                      .map((f) => {
                        const rawEditedExtractedFieldsByFkey = editedExtractedFields[f.key];
                        return (
                          <div key={f.label}>
                            <dt className="text-xs font-medium text-gray-500">{f.label}</dt>
                            {isEditingExtracted ? (
                              <input
                                type="text"
                                value={rawEditedExtractedFieldsByFkey || ""}
                                onChange={(e) =>
                                  setEditedExtractedFields((prev) => ({
                                    ...prev,
                                    [f.key]: e.target.value,
                                  }))
                                }
                                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            ) : (
                              <dd className="mt-0.5 text-sm text-gray-900">{String(f.value)}</dd>
                            )}
                          </div>
                        );
                      })}
                    {hasGraphField && !isEditingExtracted ? (
                      <div>
                        <dt className="text-xs font-medium text-gray-500">{hasGraphField.label}</dt>
                        <dd className="mt-0.5 text-sm text-gray-900">{hasGraphField.value}</dd>
                      </div>
                    ) : null}
                  </div>

                  {(() => {
                    const rawExtractedRollNumbers = extracted.rollNumbers;
                    const rawCocRejectedRollNumbers = coc.rejectedRollNumbers;
                    const rolls = (rawExtractedRollNumbers || []) as string[];
                    const rejected = rawCocRejectedRollNumbers || [];
                    if (rolls.length === 0) return null;
                    return (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Roll Numbers</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {rolls.map((rn) => {
                            const isRejected = rejected.includes(String(rn));
                            return (
                              <span
                                key={String(rn)}
                                className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  isRejected
                                    ? "bg-red-50 text-red-600 line-through"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                                title={isRejected ? "Rejected — cannot be issued" : ""}
                              >
                                {String(rn)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {coc.cocType === "CALENDER_ROLL" &&
                    (() => {
                      const rawExtractedRolls = extracted.rolls;
                      const rolls = (rawExtractedRolls || []) as Array<{
                        rollNumber: string;
                        shoreA?: number | null;
                      }>;
                      if (rolls.length === 0) return null;
                      return (
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Per-Roll Shore A
                          </h3>
                          <table className="min-w-full text-sm border border-gray-200 rounded">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                                  Roll
                                </th>
                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                                  Shore A
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {rolls.map((roll) => {
                                const rawRollShoreA = roll.shoreA;
                                const shoreDisplay =
                                  rawRollShoreA == null ? "—" : String(rawRollShoreA);
                                return (
                                  <tr key={String(roll.rollNumber)}>
                                    <td className="px-3 py-1.5 font-mono text-gray-700">
                                      {String(roll.rollNumber)}
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-900">{shoreDisplay}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                  {coc.cocType === "CALENDER_ROLL" &&
                    (() => {
                      const rawBatchNumbers = extracted.batchNumbers;
                      const compoundBatchNumbers = (rawBatchNumbers || []) as string[];
                      const rawBatches = extracted.batches as
                        | Array<{
                            batchNumber: string;
                            shoreA?: number;
                            specificGravity?: number;
                            tensileStrengthMpa?: number;
                            elongationPercent?: number;
                          }>
                        | undefined;
                      const batches = rawBatches ?? [];
                      if (compoundBatchNumbers.length === 0 && batches.length === 0) return null;

                      if (batches.length > 0) {
                        return (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                              Compound Batch Test Results
                            </h3>
                            <table className="min-w-full text-sm border border-gray-200 rounded">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                                    Batch
                                  </th>
                                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                                    Shore A
                                  </th>
                                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                                    Density
                                  </th>
                                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                                    Tensile (MPa)
                                  </th>
                                  <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                                    Elong %
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {batches.map((b) => {
                                  const dash = (v: number | undefined) =>
                                    v == null ? "—" : String(v);
                                  return (
                                    <tr key={String(b.batchNumber)}>
                                      <td className="px-3 py-1.5 font-mono text-gray-700">
                                        {String(b.batchNumber)}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-900">
                                        {dash(b.shoreA)}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-900">
                                        {dash(b.specificGravity)}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-900">
                                        {dash(b.tensileStrengthMpa)}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-900">
                                        {dash(b.elongationPercent)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      return (
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Compound Batches
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {compoundBatchNumbers.map((bn) => (
                              <span
                                key={String(bn)}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-800"
                                title="Compound batch number used for this page's rolls"
                              >
                                {String(bn)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  {coc.cocType === "CALENDER_ROLL" &&
                    (() => {
                      const rawSharedDensity = extracted.sharedDensity;
                      const rawSharedTensile = extracted.sharedTensile;
                      const rawSharedElongation = extracted.sharedElongation;
                      const sharedDensity = isNumber(rawSharedDensity) ? rawSharedDensity : null;
                      const sharedTensile = isNumber(rawSharedTensile) ? rawSharedTensile : null;
                      const sharedElongation = isNumber(rawSharedElongation)
                        ? rawSharedElongation
                        : null;
                      if (
                        sharedDensity === null &&
                        sharedTensile === null &&
                        sharedElongation === null
                      ) {
                        return null;
                      }
                      return (
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Page Test Results (shared across this page&apos;s rolls)
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {sharedDensity !== null && (
                              <div className="bg-gray-50 rounded px-2 py-1">
                                Density: {sharedDensity} g/cm³
                              </div>
                            )}
                            {sharedTensile !== null && (
                              <div className="bg-gray-50 rounded px-2 py-1">
                                Tensile: {sharedTensile} MPa
                              </div>
                            )}
                            {sharedElongation !== null && (
                              <div className="bg-gray-50 rounded px-2 py-1">
                                Elongation: {sharedElongation}%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  {siblingCocs.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Sibling CoCs (same source PDF)
                      </h3>
                      <ul className="space-y-1">
                        {siblingCocs.map((sibling) => {
                          const rawSiblingCocNumber = sibling.cocNumber;
                          const rawSiblingCompoundCode = sibling.compoundCode;
                          const rawSiblingProductionDate = sibling.productionDate;
                          const siblingLabel = rawSiblingCocNumber || `COC-${sibling.id}`;
                          return (
                            <li
                              key={sibling.id}
                              className="flex items-center gap-3 text-sm bg-blue-50 rounded px-3 py-1.5"
                            >
                              <Link
                                href={`/au-rubber/portal/supplier-cocs/${sibling.id}`}
                                className="text-blue-700 hover:text-blue-900 font-medium"
                              >
                                #{sibling.id} — {siblingLabel}
                              </Link>
                              <span className="text-xs text-gray-600">
                                {rawSiblingCompoundCode || "—"}
                              </span>
                              {rawSiblingProductionDate && (
                                <span className="text-xs text-gray-500">
                                  Doc {formatDateZA(rawSiblingProductionDate)}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {values(specs).some((v) => v != null) && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Specifications</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {specs.shoreAMin != null && (
                          <div className="bg-gray-50 rounded px-2 py-1">
                            Shore A: {specs.shoreAMin}–{specs.shoreAMax}
                          </div>
                        )}
                        {specs.specificGravityMin != null && (
                          <div className="bg-gray-50 rounded px-2 py-1">
                            SG: {specs.specificGravityMin}–{specs.specificGravityMax}
                          </div>
                        )}
                        {specs.tensileMin != null && (
                          <div className="bg-gray-50 rounded px-2 py-1">
                            Tensile: {specs.tensileMin}–{specs.tensileMax} MPa
                          </div>
                        )}
                        {specs.elongationMin != null && (
                          <div className="bg-gray-50 rounded px-2 py-1">
                            Elongation: {specs.elongationMin}–{specs.elongationMax}%
                          </div>
                        )}
                        {specs.tearStrengthMin != null && (
                          <div className="bg-gray-50 rounded px-2 py-1">
                            Tear: {specs.tearStrengthMin}–{specs.tearStrengthMax} kN/m
                          </div>
                        )}
                        {specs.reboundMin != null && (
                          <div className="bg-gray-50 rounded px-2 py-1">
                            Rebound: {specs.reboundMin}–{specs.reboundMax}%
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {rawBatches.length > 0 && (
                    <div className="overflow-x-auto">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Batch Results</h3>
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Batch
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Shore A
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              SG
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Tensile
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Elong %
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Tear
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Rebound
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              S&apos; Min
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              S&apos; Max
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Ts2
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Tc90
                            </th>
                            {isEditingExtracted && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-10" />
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rawBatches.map((batch, bIdx) => {
                            const rawBatchBatchNumber2 = batch.batchNumber;
                            const rawBatchShoreA = batch.shoreA;
                            const rawBatchSpecificGravity = batch.specificGravity;
                            const rawBatchTensileStrengthMpa = batch.tensileStrengthMpa;
                            const rawBatchElongationPercent = batch.elongationPercent;
                            const rawBatchTearStrengthKnM = batch.tearStrengthKnM;
                            const rawBatchReboundPercent = batch.reboundPercent;
                            const rawBatchRheometerSMin = batch.rheometerSMin;
                            const rawBatchRheometerSMax = batch.rheometerSMax;
                            const rawBatchRheometerTs2 = batch.rheometerTs2;
                            const rawBatchRheometerTc90 = batch.rheometerTc90;
                            const rawBatchShoreA2 = batch.shoreA;
                            const rawBatchSpecificGravity2 = batch.specificGravity;
                            const rawBatchTensileStrengthMpa2 = batch.tensileStrengthMpa;
                            const rawBatchElongationPercent2 = batch.elongationPercent;
                            const rawBatchTearStrengthKnM2 = batch.tearStrengthKnM;
                            const rawBatchReboundPercent2 = batch.reboundPercent;
                            const rawBatchRheometerSMin2 = batch.rheometerSMin;
                            const rawBatchRheometerSMax2 = batch.rheometerSMax;
                            const rawBatchRheometerTs22 = batch.rheometerTs2;
                            const rawBatchRheometerTc902 = batch.rheometerTc90;
                            return isEditingExtracted ? (
                              <tr key={bIdx} className="bg-yellow-50">
                                <td className="px-3 py-1.5">
                                  <input
                                    type="text"
                                    value={rawBatchBatchNumber2 || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "batchNumber",
                                        e.target.value,
                                      )
                                    }
                                    className="w-20 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={rawBatchShoreA || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(bIdx, "shoreA", e.target.value)
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.001"
                                    value={rawBatchSpecificGravity || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "specificGravity",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rawBatchTensileStrengthMpa || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "tensileStrengthMpa",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={rawBatchElongationPercent || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "elongationPercent",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={rawBatchTearStrengthKnM || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "tearStrengthKnM",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={rawBatchReboundPercent || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "reboundPercent",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rawBatchRheometerSMin || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "rheometerSMin",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rawBatchRheometerSMax || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "rheometerSMax",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rawBatchRheometerTs2 || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "rheometerTs2",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rawBatchRheometerTc90 || ""}
                                    onChange={(e) =>
                                      handleExtractedBatchChange(
                                        bIdx,
                                        "rheometerTc90",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 rounded border-gray-300 text-xs px-1.5 py-1"
                                  />
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExtractedBatch(bIdx)}
                                    className="text-red-400 hover:text-red-600"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={bIdx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {batch.batchNumber}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchShoreA2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchSpecificGravity2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchTensileStrengthMpa2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchElongationPercent2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchTearStrengthKnM2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchReboundPercent2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchRheometerSMin2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchRheometerSMax2 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchRheometerTs22 || "-"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {rawBatchRheometerTc902 || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isEditingExtracted && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleSaveExtracted}
                        disabled={isSavingExtracted}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        {isSavingExtracted ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        onClick={() => setIsEditingExtracted(false)}
                        disabled={isSavingExtracted}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

            {coc.reviewNotes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700">Review Notes</h3>
                <p className="mt-1 text-sm text-gray-600">{coc.reviewNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {batches.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Compound Batches</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shore A
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specific Gravity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tensile (MPa)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Elongation (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tear (kN/m)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rebound (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {coc.cocType === "CALENDARER" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      S&N CoC
                    </th>
                  )}
                  {coc.processingStatus !== "APPROVED" && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batches.map((batch) => {
                  const rawBatchShoreAHardness = batch.shoreAHardness;
                  const rawBatchSpecificGravity3 = batch.specificGravity;
                  const rawBatchTensileStrengthMpa3 = batch.tensileStrengthMpa;
                  const rawBatchElongationPercent3 = batch.elongationPercent;
                  const rawBatchTearStrengthKnM3 = batch.tearStrengthKnM;
                  const rawBatchReboundPercent3 = batch.reboundPercent;
                  const rawBatchSupplierCocNumber = batch.supplierCocNumber;
                  const isEditingRow = editingBatchId === batch.id;
                  if (isEditingRow) {
                    const rawBatchPassFailStatusLabel = batch.passFailStatusLabel;
                    return (
                      <tr key={batch.id} className="bg-yellow-50">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editBatchFields.batchNumber}
                            onChange={(e) =>
                              setEditBatchFields({
                                ...editBatchFields,
                                batchNumber: e.target.value,
                              })
                            }
                            className="w-16 rounded border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={editBatchFields.shoreAHardness}
                            onChange={(e) =>
                              setEditBatchFields({
                                ...editBatchFields,
                                shoreAHardness: e.target.value,
                              })
                            }
                            className="w-16 rounded border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.001"
                            value={editBatchFields.specificGravity}
                            onChange={(e) =>
                              setEditBatchFields({
                                ...editBatchFields,
                                specificGravity: e.target.value,
                              })
                            }
                            className="w-20 rounded border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editBatchFields.tensileStrengthMpa}
                            onChange={(e) =>
                              setEditBatchFields({
                                ...editBatchFields,
                                tensileStrengthMpa: e.target.value,
                              })
                            }
                            className="w-20 rounded border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={editBatchFields.elongationPercent}
                            onChange={(e) =>
                              setEditBatchFields({
                                ...editBatchFields,
                                elongationPercent: e.target.value,
                              })
                            }
                            className="w-20 rounded border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={editBatchFields.tearStrengthKnM}
                            onChange={(e) =>
                              setEditBatchFields({
                                ...editBatchFields,
                                tearStrengthKnM: e.target.value,
                              })
                            }
                            className="w-20 rounded border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editBatchFields.reboundPercent}
                            onChange={(e) =>
                              setEditBatchFields({
                                ...editBatchFields,
                                reboundPercent: e.target.value,
                              })
                            }
                            className="w-20 rounded border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {rawBatchPassFailStatusLabel || "-"}
                        </td>
                        {coc.cocType === "CALENDARER" && (
                          <td className="px-4 py-2 text-sm text-gray-500">-</td>
                        )}
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={handleSaveBatch}
                            disabled={isSavingBatch}
                            className="text-sm text-green-600 hover:text-green-800 font-medium mr-2 disabled:opacity-50"
                          >
                            {isSavingBatch ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingBatchId(null)}
                            disabled={isSavingBatch}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {batch.batchNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawBatchShoreAHardness || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawBatchSpecificGravity3 || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawBatchTensileStrengthMpa3 || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawBatchElongationPercent3 || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawBatchTearStrengthKnM3 || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawBatchReboundPercent3 || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            batch.passFailStatus === "PASS"
                              ? "bg-green-100 text-green-800"
                              : batch.passFailStatus === "FAIL"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {batch.passFailStatusLabel}
                        </span>
                      </td>
                      {coc.cocType === "CALENDARER" && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {batch.supplierCocId && batch.supplierCocId !== cocId ? (
                            <Link
                              href={`/au-rubber/portal/supplier-cocs/${batch.supplierCocId}`}
                              className="text-yellow-600 hover:text-yellow-800 font-medium"
                            >
                              {rawBatchSupplierCocNumber || `CoC-${batch.supplierCocId}`}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {coc.processingStatus !== "APPROVED" && (
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => startEditingBatch(batch)}
                            className="text-gray-400 hover:text-gray-600 mr-2"
                            title="Edit batch"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBatch(batch.id)}
                            className="text-red-400 hover:text-red-600"
                            title="Delete batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {coc && <RollRejectionsPanel supplierCoc={coc} onRejectionCreated={fetchData} />}
      {ConfirmDialog}
    </div>
  );
}
