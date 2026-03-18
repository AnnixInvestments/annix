"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import {
  ImageViewerToolbar,
  imageViewerTransform,
  useImageViewer,
} from "@/app/components/ImageViewerToolbar";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type DeliveryNoteStatus,
  type DeliveryNoteType,
  type ExtractedDeliveryNoteData,
  type ExtractedDeliveryNoteRoll,
  type RubberDeliveryNoteDto,
  type RubberDeliveryNoteItemDto,
  type RubberSupplierCocDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";

interface EditableRoll extends ExtractedDeliveryNoteRoll {
  isEdited?: boolean;
  customerName?: string;
  customerReference?: string;
  pageNumber?: number;
}

interface EditableExtractedData extends Omit<ExtractedDeliveryNoteData, "rolls"> {
  rolls?: EditableRoll[];
  isEdited?: boolean;
  customerName?: string;
  customerReference?: string;
}

function calculateAreaSqM(widthMm?: number, lengthM?: number): number | null {
  if (widthMm && lengthM) {
    return (widthMm * lengthM) / 1000;
  }
  return null;
}

function safeFixed(value: unknown, decimals: number): string | null {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num.toFixed(decimals);
}

export default function DeliveryNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [note, setNote] = useState<RubberDeliveryNoteDto | null>(null);
  const [items, setItems] = useState<RubberDeliveryNoteItemDto[]>([]);
  const [availableCocs, setAvailableCocs] = useState<RubberSupplierCocDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedCocId, setSelectedCocId] = useState<number | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<EditableExtractedData[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showPodModal, setShowPodModal] = useState(false);
  const [podPageNumber, setPodPageNumber] = useState<number | null>(null);
  const [podPageUrl, setPodPageUrl] = useState<string | null>(null);
  const [isLoadingPod, setIsLoadingPod] = useState(false);
  const podViewer = useImageViewer();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCustomerDn, setIsCustomerDn] = useState(false);

  const noteId = Number(params.id);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [noteData, itemsData, cocsData, companiesData] = await Promise.all([
        auRubberApiClient.deliveryNoteById(noteId),
        auRubberApiClient.deliveryNoteItems(noteId),
        auRubberApiClient.supplierCocs({ processingStatus: "APPROVED" }),
        auRubberApiClient.companies(),
      ]);
      if (!noteData || !noteData.id) {
        throw new Error("Delivery note not found");
      }
      setNote(noteData);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setAvailableCocs(Array.isArray(cocsData) ? cocsData : []);
      const companies = Array.isArray(companiesData) ? companiesData : [];
      const noteCompany = companies.find((c) => c.id === noteData.supplierCompanyId);
      setIsCustomerDn(noteCompany?.companyType === "CUSTOMER");
      setError(null);
      setEditedData(null);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (noteId) {
      fetchData();
    }
  }, [noteId]);

  const initializeEditableData = (): EditableExtractedData[] => {
    if (!note?.extractedData) return [];
    const items = Array.isArray(note.extractedData) ? note.extractedData : [note.extractedData];
    return items
      .filter((item): item is ExtractedDeliveryNoteData => item !== null && item !== undefined)
      .map((item) => ({
        ...item,
        rolls: item.rolls
          ?.filter((r): r is ExtractedDeliveryNoteRoll => r != null && typeof r === "object")
          .map((roll) => ({ ...roll })),
      }));
  };

  const handleStartEditing = () => {
    setEditedData(initializeEditableData());
  };

  const handleCancelEditing = () => {
    setEditedData(null);
    setHasUnsavedChanges(false);
  };

  const handleRollFieldChange = (
    dnIdx: number,
    rollIdx: number,
    field: keyof EditableRoll,
    value: string,
  ) => {
    if (!editedData) return;
    const newData = [...editedData];
    const rolls = newData[dnIdx].rolls;
    if (!rolls) return;

    const stringFields: (keyof EditableRoll)[] = [
      "rollNumber",
      "deliveryNoteNumber",
      "deliveryDate",
      "customerName",
      "customerReference",
    ];
    const isStringField = stringFields.includes(field);
    const parsedValue = isStringField ? value : value === "" ? undefined : Number(value);

    rolls[rollIdx] = {
      ...rolls[rollIdx],
      [field]: parsedValue,
      isEdited: true,
    };
    newData[dnIdx].isEdited = true;
    setEditedData(newData);
    setHasUnsavedChanges(true);
  };

  const handleDnFieldChange = (
    dnIdx: number,
    field: keyof EditableExtractedData,
    value: string,
  ) => {
    if (!editedData) return;
    const newData = [...editedData];
    newData[dnIdx] = {
      ...newData[dnIdx],
      [field]: field === "totalWeightKg" ? (value === "" ? undefined : Number(value)) : value,
      isEdited: true,
    };
    setEditedData(newData);
    setHasUnsavedChanges(true);
  };

  const handleAddRow = (dnIdx: number) => {
    if (!editedData) return;
    const newData = [...editedData];
    const existing = newData[dnIdx];
    const lastRoll = existing.rolls?.length ? existing.rolls[existing.rolls.length - 1] : null;
    const newRoll: EditableRoll = {
      rollNumber: "",
      thicknessMm: lastRoll?.thicknessMm || undefined,
      widthMm: lastRoll?.widthMm || undefined,
      lengthM: lastRoll?.lengthM || undefined,
      weightKg: undefined,
      deliveryNoteNumber: lastRoll?.deliveryNoteNumber || note?.deliveryNoteNumber || undefined,
      deliveryDate: lastRoll?.deliveryDate || note?.deliveryDate || undefined,
      customerName: lastRoll?.customerName || existing.customerName || undefined,
      customerReference: lastRoll?.customerReference || existing.customerReference || undefined,
      isEdited: true,
    };
    newData[dnIdx] = {
      ...existing,
      rolls: [...(existing.rolls || []), newRoll],
      isEdited: true,
    };
    setEditedData(newData);
    setHasUnsavedChanges(true);
  };

  const handleRemoveRow = (dnIdx: number, rollIdx: number) => {
    if (!editedData) return;
    const newData = [...editedData];
    const rolls = newData[dnIdx].rolls;
    if (!rolls || rolls.length <= 1) return;
    newData[dnIdx] = {
      ...newData[dnIdx],
      rolls: rolls.filter((_, idx) => idx !== rollIdx),
      isEdited: true,
    };
    setEditedData(newData);
    setHasUnsavedChanges(true);
  };

  const handleSaveCorrections = async () => {
    if (!editedData || !note) return;

    try {
      setIsSaving(true);
      const allRolls: ExtractedDeliveryNoteRoll[] = [];
      editedData.forEach((dn) => {
        if (dn.rolls) {
          dn.rolls.forEach((roll) => {
            allRolls.push({
              rollNumber: roll.rollNumber,
              thicknessMm: roll.thicknessMm,
              widthMm: roll.widthMm,
              lengthM: roll.lengthM,
              weightKg: roll.weightKg,
              areaSqM: calculateAreaSqM(roll.widthMm, roll.lengthM) ?? undefined,
              deliveryNoteNumber: roll.deliveryNoteNumber,
              deliveryDate: roll.deliveryDate,
              customerName: roll.customerName,
              customerReference: roll.customerReference,
              pageNumber: roll.pageNumber,
            });
          });
        }
      });

      const firstDn = editedData[0];
      const correctionData: ExtractedDeliveryNoteData = {
        deliveryNoteNumber: firstDn?.deliveryNoteNumber,
        deliveryDate: firstDn?.deliveryDate,
        supplierName: firstDn?.supplierName,
        customerName: firstDn?.customerName,
        customerReference: firstDn?.customerReference,
        batchRange: firstDn?.batchRange,
        totalWeightKg: firstDn?.totalWeightKg,
        rolls: allRolls,
      };

      await auRubberApiClient.saveExtractedDataCorrections(noteId, correctionData);
      showToast("Corrections saved successfully - Nix will learn from these changes", "success");
      setHasUnsavedChanges(false);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save corrections", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtract = async () => {
    try {
      setIsExtracting(true);
      await auRubberApiClient.extractDeliveryNote(noteId);
      showToast("Data extracted successfully", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to extract data", "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleViewPod = async (pageNumber: number) => {
    if (!note?.documentPath) return;

    try {
      setIsLoadingPod(true);
      setPodPageNumber(pageNumber);
      setShowPodModal(true);
      const url = await auRubberApiClient.deliveryNotePageUrl(noteId, pageNumber);
      setPodPageUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load POD page", "error");
      setShowPodModal(false);
    } finally {
      setIsLoadingPod(false);
    }
  };

  const closePodModal = () => {
    setShowPodModal(false);
    setPodPageNumber(null);
    setPodPageUrl(null);
    podViewer.reset();
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await auRubberApiClient.deleteDeliveryNote(noteId);
      showToast("Delivery note deleted successfully", "success");
      router.back();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete delivery note", "error");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLinkCoc = async () => {
    if (!selectedCocId) {
      showToast("Please select a CoC", "error");
      return;
    }
    try {
      setIsLinking(true);
      await auRubberApiClient.linkDeliveryNoteToCoc(noteId, selectedCocId);
      showToast("CoC linked successfully", "success");
      setShowLinkModal(false);
      setSelectedCocId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to link CoC", "error");
    } finally {
      setIsLinking(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsFinalizing(true);
      await auRubberApiClient.finalizeDeliveryNote(noteId);
      showToast("Delivery note finalized and stock created", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to finalize", "error");
    } finally {
      setIsFinalizing(false);
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
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status]}`}
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

  if (error || !note) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Delivery note not found"}</p>
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

  const unlinkedCocs = availableCocs.filter((coc) => !coc.linkedDeliveryNoteId);

  const hasExtractedData =
    note.extractedData &&
    (() => {
      const hasFields = (item: ExtractedDeliveryNoteData) =>
        item.deliveryNoteNumber ||
        item.deliveryDate ||
        item.supplierName ||
        item.customerName ||
        item.customerReference ||
        item.batchRange ||
        item.totalWeightKg ||
        (item.rolls && item.rolls.length > 0);

      if (Array.isArray(note.extractedData)) {
        return (
          note.extractedData.length > 0 &&
          note.extractedData.some((item) => item && hasFields(item))
        );
      }
      return hasFields(note.extractedData);
    })();

  const isEditing = editedData !== null;
  const displayData: EditableExtractedData[] = isEditing
    ? editedData
    : note.extractedData
      ? (Array.isArray(note.extractedData) ? note.extractedData : [note.extractedData]).filter(
          (item): item is ExtractedDeliveryNoteData => item !== null && item !== undefined,
        )
      : [];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          {
            label: searchParams.get("returnUrl")
              ? "Back"
              : isCustomerDn
                ? "Customer Delivery Notes"
                : "Supplier Delivery Notes",
            href:
              searchParams.get("returnUrl") ||
              (isCustomerDn
                ? "/au-rubber/portal/delivery-notes/customers"
                : "/au-rubber/portal/delivery-notes/suppliers"),
          },
          { label: note.deliveryNoteNumber || `DN-${note.id}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {note.deliveryNoteNumber || `DN-${note.id}`}
          </h1>
          <div className="mt-2 flex items-center space-x-3">
            {typeBadge(note.deliveryNoteType)}
            {statusBadge(note.status)}
            {!Array.isArray(note.extractedData) && note.extractedData?.userCorrected && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                User Corrected
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          {(note.status === "PENDING" || note.status === "EXTRACTED") && (
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isExtracting
                ? "Extracting..."
                : hasExtractedData
                  ? "Re-extract Data"
                  : "Extract Data"}
            </button>
          )}
          {(note.status === "PENDING" || note.status === "EXTRACTED") &&
            !note.linkedCocId &&
            unlinkedCocs.length > 0 && (
              <button
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Link to CoC
              </button>
            )}
          {note.status === "LINKED" && (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isFinalizing ? "Finalizing..." : "Finalize & Create Stock"}
            </button>
          )}
          {note.status !== "STOCK_CREATED" && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Note Details</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">DN Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.deliveryNoteNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Customer</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.supplierCompanyName || "-"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">PO / Ref</dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium text-blue-600">
              {note.customerReference || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.deliveryNoteTypeLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Delivery Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {note.deliveryDate ? formatDateZA(note.deliveryDate) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.statusLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDateTimeZA(note.createdAt)}</dd>
          </div>
        </dl>
        {note.linkedCocId && (
          <div className="mt-4 pt-4 border-t">
            <Link
              href={`/au-rubber/portal/supplier-cocs/${note.linkedCocId}`}
              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
            >
              View Linked CoC
            </Link>
          </div>
        )}
      </div>

      {hasExtractedData && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Extracted Data</h2>
              <p className="text-sm text-gray-500 mt-1">
                {isEditing
                  ? "Edit fields below and save to teach Nix the correct values"
                  : "Click Edit to correct any extraction errors"}
              </p>
            </div>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEditing}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCorrections}
                    disabled={isSaving || !hasUnsavedChanges}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Corrections"}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEditing}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {displayData.length > 0 && displayData[0]?.customerReference !== undefined && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Customer Ref / PO Number:
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={displayData[0]?.customerReference || ""}
                      onChange={(e) => handleDnFieldChange(0, "customerReference", e.target.value)}
                      className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="e.g. PL7894/PO6797"
                    />
                  ) : (
                    <span className="ml-2 text-sm font-semibold text-gray-900">
                      {displayData[0]?.customerReference || "-"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {displayData.length > 0 && !displayData[0]?.customerReference && isEditing && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Customer Ref / PO Number:
                  </span>
                  <input
                    type="text"
                    value={displayData[0]?.customerReference || ""}
                    onChange={(e) => handleDnFieldChange(0, "customerReference", e.target.value)}
                    className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="e.g. PL7894/PO6797"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thickness (mm)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Width (mm)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Length (m)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area (m²)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight (kg)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DN Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO/Ref
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  {isEditing && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10" />
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.flatMap((dn, dnIdx) =>
                  dn.rolls && dn.rolls.length > 0
                    ? dn.rolls
                        .filter((r): r is EditableRoll => r != null && typeof r === "object")
                        .map((roll, rollIdx) => {
                          const areaSqM = calculateAreaSqM(roll.widthMm, roll.lengthM);

                          return (
                            <tr
                              key={`${dnIdx}-${rollIdx}`}
                              className={`hover:bg-gray-50 ${roll.isEdited ? "bg-yellow-50" : ""}`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={roll.rollNumber || ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "rollNumber",
                                        e.target.value,
                                      )
                                    }
                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : (
                                  <span className="font-medium text-gray-900">
                                    {roll.rollNumber || "-"}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={roll.thicknessMm != null ? roll.thicknessMm : ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "thicknessMm",
                                        e.target.value,
                                      )
                                    }
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : roll.thicknessMm != null ? (
                                  roll.thicknessMm
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={roll.widthMm != null ? roll.widthMm : ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "widthMm",
                                        e.target.value,
                                      )
                                    }
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : roll.widthMm != null ? (
                                  roll.widthMm
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={roll.lengthM != null ? roll.lengthM : ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "lengthM",
                                        e.target.value,
                                      )
                                    }
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : roll.lengthM != null ? (
                                  roll.lengthM
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {areaSqM ? areaSqM.toFixed(2) : "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={roll.weightKg != null ? roll.weightKg : ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "weightKg",
                                        e.target.value,
                                      )
                                    }
                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : safeFixed(roll.weightKg, 2) != null ? (
                                  safeFixed(roll.weightKg, 2)
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={roll.deliveryNoteNumber || note.deliveryNoteNumber || ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "deliveryNoteNumber",
                                        e.target.value,
                                      )
                                    }
                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : (
                                  roll.deliveryNoteNumber || note.deliveryNoteNumber || "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={roll.deliveryDate || note.deliveryDate || ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "deliveryDate",
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : (
                                  note.deliveryDate || "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={roll.customerName || dn.customerName || ""}
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "customerName",
                                        e.target.value,
                                      )
                                    }
                                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : (
                                  roll.customerName || dn.customerName || "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={
                                      roll.customerReference ||
                                      dn.customerReference ||
                                      note.customerReference ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleRollFieldChange(
                                        dnIdx,
                                        rollIdx,
                                        "customerReference",
                                        e.target.value,
                                      )
                                    }
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                ) : (
                                  roll.customerReference ||
                                  dn.customerReference ||
                                  note.customerReference ||
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {roll.pageNumber || "-"}
                              </td>
                              {isEditing && (
                                <td className="px-2 py-3 whitespace-nowrap">
                                  <button
                                    onClick={() => handleRemoveRow(dnIdx, rollIdx)}
                                    disabled={(dn.rolls || []).length <= 1}
                                    className="text-red-400 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                                    title="Remove row"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                    : [
                        <tr key={dnIdx} className="hover:bg-gray-50">
                          <td colSpan={6} className="px-4 py-3 text-sm text-gray-500 text-center">
                            No rolls data
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {dn.deliveryNoteNumber || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {dn.deliveryDate || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {dn.customerName || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                            {dn.customerReference || note.customerReference || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">-</td>
                        </tr>,
                      ],
                )}
              </tbody>
            </table>
            {isEditing && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => handleAddRow(0)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Row
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {note.podPageNumbers && note.podPageNumbers.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Proof of Delivery</h2>
          </div>
          <div className="px-6 py-4 flex flex-wrap gap-3">
            {note.podPageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handleViewPod(pageNum)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                View POD - Page {pageNum}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {note.deliveryNoteType === "COMPOUND" ? "Batch Items" : "Roll Items"}
            </h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {note.deliveryNoteType === "COMPOUND" ? (
                  <>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Batch Range
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Weight (kg)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Linked Batches
                    </th>
                  </>
                ) : (
                  <>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Roll Number
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Thickness (mm)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Width (mm)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Length (m)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Area (m²)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Weight (kg)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Theo. Weight
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Deviation
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Linked Batches
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const itemAreaSqM =
                  item.widthMm && item.lengthM ? (item.widthMm * item.lengthM) / 1000 : null;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 ${item.weightFlagged ? "bg-amber-50" : ""}`}
                  >
                    {note.deliveryNoteType === "COMPOUND" ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.batchNumberStart}
                          {item.batchNumberEnd && item.batchNumberEnd !== item.batchNumberStart
                            ? ` - ${item.batchNumberEnd}`
                            : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {safeFixed(item.weightKg, 2) || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.linkedBatchIds?.length || 0}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.rollNumber || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.thicknessMm != null ? item.thicknessMm : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.widthMm != null ? item.widthMm : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.lengthM != null ? item.lengthM : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {itemAreaSqM ? itemAreaSqM.toFixed(2) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {safeFixed(item.rollWeightKg, 2) || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {safeFixed(item.theoreticalWeightKg, 2) || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.weightDeviationPct != null ? (
                            <span
                              className={`inline-flex items-center ${item.weightFlagged ? "text-amber-700 font-semibold" : "text-gray-500"}`}
                            >
                              {item.weightFlagged && (
                                <svg
                                  className="w-4 h-4 mr-1 text-amber-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {item.weightDeviationPct > 0 ? "+" : ""}
                              {safeFixed(item.weightDeviationPct, 1)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.linkedBatchIds?.length || 0}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowLinkModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Link to Supplier CoC</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select CoC</label>
                  <select
                    value={selectedCocId ?? ""}
                    onChange={(e) =>
                      setSelectedCocId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="">Select a CoC</option>
                    {unlinkedCocs.map((coc) => (
                      <option key={coc.id} value={coc.id}>
                        {coc.cocNumber || `COC-${coc.id}`} - {coc.supplierCompanyName} (
                        {coc.cocTypeLabel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkCoc}
                  disabled={isLinking || !selectedCocId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLinking ? "Linking..." : "Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPodModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closePodModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Proof of Delivery - Page {podPageNumber}
                </h3>
                <div className="flex items-center space-x-2">
                  <ImageViewerToolbar
                    state={podViewer.state}
                    onZoomIn={podViewer.zoomIn}
                    onZoomOut={podViewer.zoomOut}
                    onRotate={podViewer.rotateClockwise}
                    onReset={podViewer.reset}
                  />
                  {podPageUrl && (
                    <>
                      <button
                        onClick={() => {
                          const printWindow = window.open("", "_blank");
                          if (printWindow) {
                            printWindow.document.write(
                              `<html><head><title>POD Page ${podPageNumber}</title></head><body style="margin:0;display:flex;justify-content:center"><img src="${podPageUrl}" onload="window.print();window.close()" style="max-width:100%" /></body></html>`,
                            );
                            printWindow.document.close();
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Print"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          const response = await fetch(podPageUrl);
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `POD-Page-${podPageNumber}.png`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Download"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                  <button onClick={closePodModal} className="text-gray-400 hover:text-gray-500">
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {isLoadingPod ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
                  </div>
                ) : podPageUrl ? (
                  <img
                    src={podPageUrl}
                    alt={`POD Page ${podPageNumber}`}
                    className="max-w-full max-h-[calc(90vh-120px)] w-auto h-auto mx-auto object-contain select-none"
                    style={imageViewerTransform(podViewer.state)}
                    onMouseDown={podViewer.handleMouseDown}
                    draggable={false}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">Failed to load POD page</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Delivery Note</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete this delivery note? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
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
