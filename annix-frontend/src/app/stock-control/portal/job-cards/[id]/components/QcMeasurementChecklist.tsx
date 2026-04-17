"use client";

import { useCallback, useEffect, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type {
  CoatingAnalysis,
  PositectorUploadRecord,
  QcDefelskoBatchRecord,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface ExpectedRow {
  fieldKey: string;
  label: string;
  category: string;
}

interface QcMeasurementChecklistProps {
  jobCardId: number;
  coatingAnalysis: CoatingAnalysis | null;
}

function buildExpectedRows(coatingAnalysis: CoatingAnalysis | null): ExpectedRow[] {
  const rows: ExpectedRow[] = [];

  const coats = coatingAnalysis ? coatingAnalysis.coats : [];
  const hasPaint = coats.length > 0;
  const hasRubber = coatingAnalysis ? coatingAnalysis.hasInternalLining === true : false;

  if (hasPaint) {
    rows.push({
      fieldKey: "paint_blast_profile",
      label: "Paint Blast Profile",
      category: "defelsko_paint",
    });

    const rawNotes = coatingAnalysis ? coatingAnalysis.rawNotes : null;
    const notesUpper = rawNotes ? rawNotes.toUpperCase() : "";
    const bandingIdx = notesUpper.indexOf("BANDING");
    const preBanding = bandingIdx >= 0 ? notesUpper.substring(0, bandingIdx) : notesUpper;
    const postBanding = bandingIdx >= 0 ? notesUpper.substring(bandingIdx) : "";

    coats.forEach((coat, idx) => {
      const coatProduct = coat.product;
      const productUpper = coatProduct ? coatProduct.toUpperCase() : "";
      const inBandingOnly =
        postBanding.length > 0 &&
        productUpper.length > 0 &&
        postBanding.includes(productUpper) &&
        !preBanding.includes(productUpper);
      if (inBandingOnly) return;
      const product = coatProduct || `Coat ${idx + 1}`;
      rows.push({
        fieldKey: `paint_dft_${idx}`,
        label: `DFT - ${product}`,
        category: "defelsko_paint",
      });
    });
  }

  if (hasRubber) {
    rows.push({
      fieldKey: "rubber_blast_profile",
      label: "Rubber Blast Profile",
      category: "defelsko_rubber",
    });
    rows.push({
      fieldKey: "rubber_shore_hardness",
      label: "Shore Hardness",
      category: "defelsko_rubber",
    });
  }

  rows.push({
    fieldKey: "environmental",
    label: "Environmental",
    category: "defelsko_environmental",
  });

  return rows;
}

function statusForRow(
  row: ExpectedRow,
  batchMap: Map<string, QcDefelskoBatchRecord>,
  uploadsByBatch: Map<string, PositectorUploadRecord>,
): {
  status: "linked" | "pending" | "not_set";
  batch: string | null;
  upload: PositectorUploadRecord | null;
} {
  const batchRecord = batchMap.get(row.fieldKey) || null;
  const rawBatchNumber = batchRecord ? batchRecord.batchNumber : null;
  const batchNumber = rawBatchNumber || null;

  if (!batchNumber) {
    return { status: "not_set", batch: null, upload: null };
  }

  const upload = uploadsByBatch.get(batchNumber) || null;

  if (upload) {
    return { status: "linked", batch: batchNumber, upload };
  }

  return { status: "pending", batch: batchNumber, upload: null };
}

export function QcMeasurementChecklist(props: QcMeasurementChecklistProps) {
  const jobCardId = props.jobCardId;
  const coatingAnalysis = props.coatingAnalysis;

  const [batches, setBatches] = useState<QcDefelskoBatchRecord[]>([]);
  const [uploads, setUploads] = useState<PositectorUploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pdfPreview = usePdfPreview();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [batchRes, uploadRes] = await Promise.all([
        stockControlApiClient.defelskoBatchesForJobCard(jobCardId),
        stockControlApiClient.positectorUploadsForJobCard(jobCardId),
      ]);
      setBatches(Array.isArray(batchRes) ? batchRes : []);
      setUploads(Array.isArray(uploadRes) ? uploadRes : []);
    } catch {
      setBatches([]);
      setUploads([]);
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const expectedRows = buildExpectedRows(coatingAnalysis);

  const batchMap = new Map<string, QcDefelskoBatchRecord>();
  batches.forEach((b) => {
    batchMap.set(b.fieldKey, b);
  });

  const uploadsByBatch = new Map<string, PositectorUploadRecord>();
  uploads.forEach((u) => {
    const name = u.batchName;
    if (name) {
      uploadsByBatch.set(name, u);
    }
  });

  const handleViewPdf = async (uploadId: number, filename: string) => {
    try {
      const result = await stockControlApiClient.positectorUploadDownloadUrl(uploadId);
      const url = result.url;
      pdfPreview.open(url, filename);
    } catch {
      /* empty */
    }
  };

  if (isLoading) {
    return null;
  }

  if (expectedRows.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">QC Measurement Checklist</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Batch #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Readings
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expectedRows.map((row) => {
                const rowStatus = statusForRow(row, batchMap, uploadsByBatch);
                const upload = rowStatus.upload;
                const readingCount = upload ? upload.readingCount : 0;
                const uploadFilename = upload ? upload.originalFilename : "report.pdf";
                const uploadId = upload ? upload.id : null;
                const batch = rowStatus.batch;
                const batchLabel = batch || "-";
                const status = rowStatus.status;

                return (
                  <tr key={row.fieldKey} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {row.label}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {batchLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {status === "linked" && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Linked
                        </span>
                      )}
                      {status === "pending" && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Pending
                        </span>
                      )}
                      {status === "not_set" && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          Not Set
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {readingCount > 0 ? readingCount : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {uploadId && (
                        <button
                          onClick={() => handleViewPdf(uploadId, uploadFilename)}
                          className="text-sm text-teal-600 hover:text-teal-800"
                        >
                          View PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </>
  );
}
