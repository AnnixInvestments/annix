"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
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

interface EditableRoll extends ExtractedDeliveryNoteRoll {
  isEdited?: boolean;
  customerName?: string;
  pageNumber?: number;
}

interface EditableExtractedData extends Omit<ExtractedDeliveryNoteData, "rolls"> {
  rolls?: EditableRoll[];
  isEdited?: boolean;
  customerName?: string;
}

function calculateAreaSqM(widthMm?: number, lengthM?: number): number | null {
  if (widthMm && lengthM) {
    return (widthMm * lengthM) / 1000;
  }
  return null;
}

export default function DeliveryNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
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
  const [isAccepting, setIsAccepting] = useState(false);
  const [showPodModal, setShowPodModal] = useState(false);
  const [podPageNumber, setPodPageNumber] = useState<number | null>(null);
  const [podPageUrl, setPodPageUrl] = useState<string | null>(null);
  const [isLoadingPod, setIsLoadingPod] = useState(false);

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
      setNote(noteData);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setAvailableCocs(Array.isArray(cocsData) ? cocsData : []);
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
    return items.map((item) => ({
      ...item,
      rolls: item.rolls?.map((roll) => ({ ...roll })),
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

  const handleAcceptExtract = async () => {
    try {
      setIsAccepting(true);
      await auRubberApiClient.acceptDeliveryNoteExtract(noteId);
      showToast("Extract accepted", "success");
      router.push("/au-rubber/portal/delivery-notes/suppliers");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to accept extract", "error");
      setIsAccepting(false);
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
      if (Array.isArray(note.extractedData)) {
        return (
          note.extractedData.length > 0 &&
          note.extractedData.some(
            (item) =>
              item.deliveryNoteNumber ||
              item.deliveryDate ||
              item.supplierName ||
              item.batchRange ||
              item.totalWeightKg ||
              (item.rolls && item.rolls.length > 0),
          )
        );
      }
      return (
        note.extractedData.deliveryNoteNumber ||
        note.extractedData.deliveryDate ||
        note.extractedData.supplierName ||
        note.extractedData.batchRange ||
        note.extractedData.totalWeightKg ||
        (note.extractedData.rolls && note.extractedData.rolls.length > 0)
      );
    })();

  const isEditing = editedData !== null;
  const displayData: EditableExtractedData[] = isEditing
    ? editedData
    : note.extractedData
      ? Array.isArray(note.extractedData)
        ? note.extractedData
        : [note.extractedData]
      : [];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Delivery Notes", href: "/au-rubber/portal/delivery-notes" },
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
          {note.status === "PENDING" && (
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
          {note.status === "PENDING" && !note.linkedCocId && unlinkedCocs.length > 0 && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Link to CoC
            </button>
          )}
          {note.status === "PENDING" && hasExtractedData && (
            <button
              onClick={handleAcceptExtract}
              disabled={isAccepting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isAccepting ? "Accepting..." : "Accept Extract"}
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
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Note Details</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">DN Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.deliveryNoteNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Supplier</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.supplierCompanyName || "-"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.deliveryNoteTypeLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Delivery Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {note.deliveryDate ? new Date(note.deliveryDate).toLocaleDateString() : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{note.statusLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(note.createdAt).toLocaleString()}
            </dd>
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
                    POD
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.flatMap((dn, dnIdx) =>
                  dn.rolls && dn.rolls.length > 0
                    ? dn.rolls.map((roll, rollIdx) => {
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
                                  value={roll.thicknessMm ?? ""}
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
                              ) : (
                                (roll.thicknessMm ?? "-")
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={roll.widthMm ?? ""}
                                  onChange={(e) =>
                                    handleRollFieldChange(dnIdx, rollIdx, "widthMm", e.target.value)
                                  }
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                />
                              ) : (
                                (roll.widthMm ?? "-")
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={roll.lengthM ?? ""}
                                  onChange={(e) =>
                                    handleRollFieldChange(dnIdx, rollIdx, "lengthM", e.target.value)
                                  }
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
                                />
                              ) : (
                                (roll.lengthM ?? "-")
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
                                  value={roll.weightKg ?? ""}
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
                              ) : (
                                (roll.weightKg?.toFixed(2) ?? "-")
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
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {note?.documentPath && roll.pageNumber ? (
                                <button
                                  onClick={() => handleViewPod(roll.pageNumber!)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                  title={`View page ${roll.pageNumber}`}
                                >
                                  View
                                </button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">-</td>
                        </tr>,
                      ],
                )}
              </tbody>
            </table>
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
                  <tr key={item.id} className="hover:bg-gray-50">
                    {note.deliveryNoteType === "COMPOUND" ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.batchNumberStart}
                          {item.batchNumberEnd && item.batchNumberEnd !== item.batchNumberStart
                            ? ` - ${item.batchNumberEnd}`
                            : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.weightKg?.toFixed(2) || "-"}
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
                          {item.thicknessMm ?? "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.widthMm ?? "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.lengthM ?? "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {itemAreaSqM ? itemAreaSqM.toFixed(2) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.rollWeightKg?.toFixed(2) || "-"}
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
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closePodModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Proof of Delivery - Page {podPageNumber}
                </h3>
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
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {isLoadingPod ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
                  </div>
                ) : podPageUrl ? (
                  <img
                    src={podPageUrl}
                    alt={`POD Page ${podPageNumber}`}
                    className="max-w-full max-h-[calc(90vh-120px)] w-auto h-auto mx-auto object-contain"
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">Failed to load POD page</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
