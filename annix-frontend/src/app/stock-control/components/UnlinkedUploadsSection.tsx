"use client";

import { useCallback, useEffect, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type { PositectorUploadRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface UnlinkedUploadsSectionProps {
  entityType: string;
  entityLabel: string;
}

export function UnlinkedUploadsSection(props: UnlinkedUploadsSectionProps) {
  const entityType = props.entityType;
  const entityLabel = props.entityLabel;

  const [uploads, setUploads] = useState<PositectorUploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pdfPreview = usePdfPreview();

  const fetchUploads = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.positectorUploads({
        unlinked: true,
        entityType,
      });
      setUploads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch unlinked uploads:", err);
      setUploads([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  if (isLoading) return null;
  if (uploads.length === 0) return null;

  const handleViewPdf = async (upload: PositectorUploadRecord) => {
    const result = await stockControlApiClient.positectorUploadDownloadUrl(upload.id);
    const downloadUrl = result.url;
    if (downloadUrl) {
      const filename = upload.batchName || upload.originalFilename || "report";
      pdfPreview.open(downloadUrl, `${filename}.pdf`);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50">
      <div className="px-4 py-3 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-amber-800">
            Unlinked PosiTector Uploads ({uploads.length})
          </h3>
          <span className="text-xs text-amber-600">
            These {entityLabel} uploads are not yet linked to a job card
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-amber-200">
          <thead className="bg-amber-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-amber-700">
                Batch
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-amber-700">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-amber-700">
                Probe
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium uppercase text-amber-700">
                Readings
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-amber-700">
                Uploaded By
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-amber-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 bg-white">
            {uploads.map((upload) => {
              const isExpanded = expandedId === upload.id;
              const isPdf = upload.detectedFormat === "posisoft_pdf";
              return (
                <UploadRow
                  key={upload.id}
                  upload={upload}
                  isExpanded={isExpanded}
                  isPdf={isPdf}
                  onToggleExpand={toggleExpand}
                  onViewPdf={handleViewPdf}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}

function UploadRow(props: {
  upload: PositectorUploadRecord;
  isExpanded: boolean;
  isPdf: boolean;
  onToggleExpand: (id: number) => void;
  onViewPdf: (upload: PositectorUploadRecord) => void;
}) {
  const upload = props.upload;
  const isExpanded = props.isExpanded;
  const isPdf = props.isPdf;
  const onToggleExpand = props.onToggleExpand;
  const onViewPdf = props.onViewPdf;

  return (
    <>
      <tr className="hover:bg-amber-50/50">
        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
          {upload.batchName || upload.originalFilename}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
          {formatDateZA(upload.createdAt)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
          {upload.probeType || "-"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 text-center">
          {upload.readingCount}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
          {upload.uploadedByName}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onToggleExpand(upload.id)}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
            {isPdf && (
              <button
                type="button"
                onClick={() => onViewPdf(upload)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View PDF
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50">
            <div className="max-h-64 overflow-y-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-xs font-medium uppercase text-gray-500">
                      #
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium uppercase text-gray-500">
                      Value
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium uppercase text-gray-500">
                      Units
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {upload.readingsData.map((reading) => {
                    const readingIndex = reading.index;
                    const readingValue = reading.value;
                    const readingUnits = reading.units;
                    return (
                      <tr key={readingIndex}>
                        <td className="px-3 py-1 text-sm text-gray-500">{readingIndex}</td>
                        <td className="px-3 py-1 text-sm font-medium text-gray-900">
                          {readingValue}
                        </td>
                        <td className="px-3 py-1 text-sm text-gray-500">{readingUnits || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
