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
      const all = await stockControlApiClient.positectorUploads();
      const filtered = (Array.isArray(all) ? all : []).filter((u) => {
        const matchesType = u.entityType === entityType;
        return matchesType;
      });
      setUploads(filtered);
    } catch {
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

  const unlinkedCount = uploads.filter((u) => u.linkedJobCardId === null).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-teal-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            PosiTector {entityLabel} Uploads ({uploads.length})
          </h3>
          {unlinkedCount > 0 && (
            <span className="text-xs text-amber-600">
              {unlinkedCount} not yet linked to a job card
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Batch
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Reading Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Probe
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">
                Readings
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                Uploaded By
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
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

  const headerData = upload.headerData;
  const createdRaw = headerData?.Created || headerData?.created || null;
  const readingDate = createdRaw ? createdRaw.split(" ")[0] : null;
  const displayDate = readingDate || upload.createdAt;
  const batchLabel = upload.batchName || upload.originalFilename;

  const isLinked = upload.linkedJobCardId !== null;
  const linkedJcId = upload.linkedJobCardId;
  const probeType = upload.probeType;
  const readingCount = upload.readingCount;
  const uploadedBy = upload.uploadedByName;

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
          {batchLabel}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
          {formatDateZA(displayDate)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{probeType || "-"}</td>
        <td className="whitespace-nowrap px-4 py-3 text-sm">
          {isLinked ? (
            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Linked to JC #{linkedJcId}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Unlinked
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 text-center">
          {readingCount}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{uploadedBy}</td>
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
          <td colSpan={7} className="px-4 py-3 bg-gray-50">
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
