"use client";

import { Download, FileText, Pencil, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CocProcessingStatus,
  type RubberCompoundBatchDto,
  type RubberSupplierCocDto,
  type SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";

export default function SupplierCocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [coc, setCoc] = useState<RubberSupplierCocDto | null>(null);
  const [batches, setBatches] = useState<RubberCompoundBatchDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    cocNumber: "",
    compoundCode: "",
    productionDate: "",
    orderNumber: "",
    ticketNumber: "",
  });
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [editBatchFields, setEditBatchFields] = useState<Record<string, string>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

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
      const [cocData, batchesData] = await Promise.all([
        auRubberApiClient.supplierCocById(cocId),
        auRubberApiClient.compoundBatchesByCocId(cocId),
      ]);
      setCoc(cocData);
      setBatches(Array.isArray(batchesData) ? batchesData : []);

      if (cocData.documentPath) {
        const url = await auRubberApiClient.documentUrl(cocData.documentPath);
        setDocumentUrl(url);
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
    try {
      setIsExtracting(true);
      await auRubberApiClient.extractSupplierCoc(cocId);
      showToast("Data extracted successfully", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to extract data", "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await auRubberApiClient.approveSupplierCoc(cocId);
      showToast("CoC approved", "success");
      router.push("/au-rubber/portal/supplier-cocs");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve CoC", "error");
      setIsApproving(false);
    }
  };

  const startEditing = () => {
    if (!coc) return;
    setEditFields({
      cocNumber: coc.cocNumber || "",
      compoundCode: coc.compoundCode || "",
      productionDate: coc.productionDate ? coc.productionDate.split("T")[0] : "",
      orderNumber: coc.orderNumber || "",
      ticketNumber: coc.ticketNumber || "",
    });
    setIsEditing(true);
  };

  const handleSaveDetails = async () => {
    if (!coc) return;
    try {
      setIsSaving(true);
      await auRubberApiClient.updateSupplierCoc(cocId, {
        cocNumber: editFields.cocNumber || null,
        compoundCode: editFields.compoundCode || null,
        productionDate: editFields.productionDate || null,
        orderNumber: editFields.orderNumber || null,
        ticketNumber: editFields.ticketNumber || null,
      });
      showToast("CoC details updated", "success");
      setIsEditing(false);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update CoC", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingBatch = (batch: RubberCompoundBatchDto) => {
    setEditingBatchId(batch.id);
    setEditBatchFields({
      batchNumber: batch.batchNumber || "",
      shoreAHardness: batch.shoreAHardness != null ? String(batch.shoreAHardness) : "",
      specificGravity: batch.specificGravity != null ? String(batch.specificGravity) : "",
      tensileStrengthMpa: batch.tensileStrengthMpa != null ? String(batch.tensileStrengthMpa) : "",
      elongationPercent: batch.elongationPercent != null ? String(batch.elongationPercent) : "",
      tearStrengthKnM: batch.tearStrengthKnM != null ? String(batch.tearStrengthKnM) : "",
    });
  };

  const handleSaveBatch = async () => {
    if (editingBatchId === null) return;
    try {
      setIsSavingBatch(true);
      const parseNum = (val: string): number | null => (val.trim() === "" ? null : Number(val));
      await auRubberApiClient.updateCompoundBatch(editingBatchId, {
        batchNumber: editBatchFields.batchNumber || undefined,
        shoreAHardness: parseNum(editBatchFields.shoreAHardness),
        specificGravity: parseNum(editBatchFields.specificGravity),
        tensileStrengthMpa: parseNum(editBatchFields.tensileStrengthMpa),
        elongationPercent: parseNum(editBatchFields.elongationPercent),
        tearStrengthKnM: parseNum(editBatchFields.tearStrengthKnM),
      });
      showToast("Batch updated", "success");
      setEditingBatchId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update batch", "error");
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
      showToast(err instanceof Error ? err.message : "Failed to delete batch", "error");
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
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "CoC not found"}</p>
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

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Supplier CoCs", href: "/au-rubber/portal/supplier-cocs" },
          { label: coc.cocNumber || `COC-${coc.id}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{coc.cocNumber || `COC-${coc.id}`}</h1>
          <div className="mt-2 flex items-center space-x-3">
            {typeBadge(coc.cocType)}
            {statusBadge(coc.processingStatus)}
          </div>
        </div>
        <div className="flex space-x-3">
          {coc.processingStatus !== "APPROVED" && (
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
          {(coc.processingStatus === "EXTRACTED" || coc.processingStatus === "NEEDS_REVIEW") && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isApproving ? "Approving..." : "Approve"}
            </button>
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
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No document available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">CoC Details</h2>
            {!isEditing && coc.processingStatus !== "APPROVED" && (
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
                <label className="block text-sm font-medium text-gray-500">CoC Number</label>
                <input
                  type="text"
                  value={editFields.cocNumber}
                  onChange={(e) => setEditFields({ ...editFields, cocNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                />
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
              {coc.cocType === "CALENDARER" && (
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
                <dd className="mt-1 text-sm text-gray-900">{coc.supplierCompanyName || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">CoC Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{coc.cocTypeLabel}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Compound Code</dt>
                <dd className="mt-1 text-sm text-gray-900">{coc.compoundCode || "-"}</dd>
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
                    <dd className="mt-1 text-sm text-gray-900">{coc.orderNumber || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ticket Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{coc.ticketNumber || "-"}</dd>
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

        {coc.extractedData && Object.keys(coc.extractedData).length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Extracted Data</h2>
            <pre className="text-xs bg-gray-50 p-4 rounded-md overflow-auto max-h-64">
              {JSON.stringify(coc.extractedData, null, 2)}
            </pre>
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
                  const isEditingRow = editingBatchId === batch.id;
                  if (isEditingRow) {
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
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {batch.passFailStatusLabel || "-"}
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
                        {batch.shoreAHardness ?? "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.specificGravity ?? "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.tensileStrengthMpa ?? "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.elongationPercent ?? "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.tearStrengthKnM ?? "-"}
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
                              {batch.supplierCocNumber || `CoC-${batch.supplierCocId}`}
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
    </div>
  );
}
