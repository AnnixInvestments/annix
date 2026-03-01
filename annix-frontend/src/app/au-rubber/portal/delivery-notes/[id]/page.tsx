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
  type RubberDeliveryNoteDto,
  type RubberDeliveryNoteItemDto,
  type RubberSupplierCocDto,
} from "@/app/lib/api/auRubberApi";

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

  const noteId = Number(params.id);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [noteData, itemsData, cocsData] = await Promise.all([
        auRubberApiClient.deliveryNoteById(noteId),
        auRubberApiClient.deliveryNoteItems(noteId),
        auRubberApiClient.supplierCocs({ processingStatus: "APPROVED" }),
      ]);
      setNote(noteData);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setAvailableCocs(Array.isArray(cocsData) ? cocsData : []);
      setError(null);
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
          </div>
        </div>
        <div className="flex space-x-3">
          {note.status === "PENDING" && !note.extractedData && (
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isExtracting ? "Extracting..." : "Extract Data"}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Note Details</h2>
          <dl className="grid grid-cols-2 gap-4">
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
            {note.linkedCocId && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Linked CoC</dt>
                <dd className="mt-1 text-sm">
                  <Link
                    href={`/au-rubber/portal/supplier-cocs/${note.linkedCocId}`}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    View Linked CoC
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {note.extractedData && Object.keys(note.extractedData).length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Extracted Data</h2>
            <pre className="text-xs bg-gray-50 p-4 rounded-md overflow-auto max-h-64">
              {JSON.stringify(note.extractedData, null, 2)}
            </pre>
          </div>
        )}
      </div>

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
                      Weight (kg)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Dimensions
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
              {items.map((item) => (
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
                        {item.rollWeightKg?.toFixed(2) || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.widthMm && item.thicknessMm && item.lengthM
                          ? `${item.widthMm}mm x ${item.thicknessMm}mm x ${item.lengthM}m`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.linkedBatchIds?.length || 0}
                      </td>
                    </>
                  )}
                </tr>
              ))}
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
    </div>
  );
}
