"use client";

import { Check, Eye, FlaskConical, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import { toastError } from "@/app/lib/api/apiError";
import { auRubberApiClient, type ChemicalSupplierDocumentDto } from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import {
  useAuRubberApproveChemicalDocument,
  useAuRubberChemicalDocuments,
  useAuRubberCompanies,
  useAuRubberDeleteChemicalDocument,
  useAuRubberUploadChemicalDocument,
} from "@/app/lib/query/hooks";
import { FileDropZone } from "../../components/FileDropZone";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  EXTRACTED: "bg-blue-100 text-blue-800",
  NEEDS_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function ChemicalSupplierDocsSection() {
  const { showToast: toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const pdfPreview = usePdfPreview();
  const { runBulk } = useAdaptiveExtractionProgress();

  const [search, setSearch] = useState("");
  const [supplierCompanyId, setSupplierCompanyId] = useState<number | null>(null);
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");

  const documentsQuery = useAuRubberChemicalDocuments(search ? { search } : undefined);
  const companiesQuery = useAuRubberCompanies();
  const uploadMutation = useAuRubberUploadChemicalDocument();
  const approveMutation = useAuRubberApproveChemicalDocument();
  const deleteMutation = useAuRubberDeleteChemicalDocument();

  const documentsData = documentsQuery.data;
  const documents = documentsData ?? [];
  const companiesData = companiesQuery.data;
  const companies = companiesData ?? [];
  const suppliers = companies.filter((c) => c.companyType === "SUPPLIER");

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!supplierCompanyId) {
      toast("Select a supplier before uploading", "error");
      return;
    }
    try {
      const uploaded = await uploadMutation.mutateAsync({
        file,
        data: {
          supplierCompanyId,
          deliveryNoteNumber: deliveryNoteNumber.trim() || undefined,
        },
      });
      await runBulk({
        brand: "au-rubber",
        metricCategory: "chemical-doc-extract",
        metricOperation: "EXTRACT",
        items: [uploaded.id],
        itemId: (id) => id,
        itemLabel: () => "Extracting chemical document…",
        run: async (id) => {
          await auRubberApiClient.extractChemicalDocument(id);
        },
      });
      await documentsQuery.refetch();
      setDeliveryNoteNumber("");
      toast("Chemical document uploaded and extracted", "success");
    } catch (error) {
      toastError(toast, error, "Something went wrong");
    }
  };

  const handleView = async (doc: ChemicalSupplierDocumentDto) => {
    const deliveryNote = doc.deliveryNoteNumber;
    const batch = doc.batchNumber;
    const label = deliveryNote || batch || `chemical-${doc.id}`;
    try {
      await pdfPreview.openWithFetch(async () => {
        const result = await auRubberApiClient.chemicalDocumentUrl(doc.id);
        const response = await fetch(result.url);
        return response.blob();
      }, `${label}.pdf`);
    } catch (error) {
      toastError(toast, error, "Something went wrong");
    }
  };

  const handleReextract = async (doc: ChemicalSupplierDocumentDto) => {
    try {
      await runBulk({
        brand: "au-rubber",
        metricCategory: "chemical-doc-extract",
        metricOperation: "EXTRACT",
        items: [doc.id],
        itemId: (id) => id,
        itemLabel: () => "Re-extracting chemical document…",
        run: async (id) => {
          await auRubberApiClient.extractChemicalDocument(id);
        },
      });
      await documentsQuery.refetch();
      toast("Re-extraction complete", "success");
    } catch (error) {
      toastError(toast, error, "Something went wrong");
    }
  };

  const handleApprove = async (doc: ChemicalSupplierDocumentDto) => {
    try {
      await approveMutation.mutateAsync(doc.id);
      toast("Document approved", "success");
    } catch (error) {
      toastError(toast, error, "Something went wrong");
    }
  };

  const handleDelete = async (doc: ChemicalSupplierDocumentDto) => {
    const confirmed = await confirm({
      title: "Delete this chemical document?",
      message: "This permanently removes the stored document set. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(doc.id);
      toast("Document deleted", "success");
    } catch (error) {
      toastError(toast, error, "Something went wrong");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
        <FlaskConical className="h-5 w-5 text-teal-600" />
        <h2 className="text-lg font-semibold text-gray-900">Chemical Suppliers</h2>
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">
          {documents.length}
        </span>
        <span className="text-sm text-gray-500">COA / Dangerous Goods / SDS documents</span>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="chem-supplier" className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <select
              id="chem-supplier"
              value={supplierCompanyId ?? ""}
              onChange={(e) => setSupplierCompanyId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select supplier…</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="chem-dn" className="block text-sm font-medium text-gray-700 mb-1">
              Delivery note number
            </label>
            <input
              id="chem-dn"
              type="text"
              value={deliveryNoteNumber}
              onChange={(e) => setDeliveryNoteNumber(e.target.value)}
              placeholder="e.g. INB86834"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <FileDropZone onFilesSelected={handleUpload} accept=".pdf,application/pdf" multiple={false}>
          <div className="border-2 border-dashed border-teal-300 rounded-lg p-6 text-center text-sm text-teal-700 cursor-pointer hover:bg-teal-50">
            Drop the merged COA/DG/SDS PDF here, or click to browse
          </div>
        </FileDropZone>

        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search delivery note, batch or product…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {search ? "No matching documents" : "No chemical documents uploaded yet"}
          </p>
        </div>
      ) : (
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Delivery Note
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                UN / Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Uploaded
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.map((doc) => {
              const extracted = doc.extractedData;
              const unNumber = extracted?.unNumber;
              const hazardClass = extracted?.hazardClass;
              const unNumberLabel = unNumber ?? "?";
              const hazardClassLabel = hazardClass ?? "?";
              const hasDgClass = unNumber || hazardClass;
              const unClass = hasDgClass ? `UN ${unNumberLabel} / ${hazardClassLabel}` : "—";
              const status = doc.processingStatus;
              const mappedBadge = STATUS_BADGE[status];
              const badgeClass = mappedBadge ?? "bg-gray-100 text-gray-700";
              const isApprovable = status === "NEEDS_REVIEW";
              const deliveryNote = doc.deliveryNoteNumber;
              const supplierName = doc.supplierName;
              const productName = doc.productName;
              const batchNumber = doc.batchNumber;
              const deliveryNoteLabel = deliveryNote || "—";
              const supplierLabel = supplierName || "—";
              const productLabel = productName || "—";
              const batchLabel = batchNumber || "—";
              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {deliveryNoteLabel}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{supplierLabel}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{productLabel}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{batchLabel}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{unClass}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badgeClass}`}
                    >
                      {doc.processingStatusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateZA(doc.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => handleView(doc)}
                        title="View document"
                        className="text-gray-500 hover:text-teal-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReextract(doc)}
                        title="Re-extract"
                        className="text-gray-500 hover:text-blue-600"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      {isApprovable && (
                        <button
                          type="button"
                          onClick={() => handleApprove(doc)}
                          title="Approve"
                          className="text-gray-500 hover:text-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        title="Delete"
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
      {ConfirmDialog}
    </div>
  );
}
