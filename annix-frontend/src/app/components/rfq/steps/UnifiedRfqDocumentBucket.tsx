"use client";

import { useMemo, useState } from "react";
import { DocumentDropzone, type PendingDocument } from "@/app/components/uploads/DocumentDropzone";

export type UnifiedDocumentRouting = "boq" | "tender";

interface RoutedDocument {
  doc: PendingDocument;
  routing: UnifiedDocumentRouting;
}

interface UnifiedRfqDocumentBucketProps {
  pendingDocuments: PendingDocument[];
  pendingTenderDocuments: PendingDocument[];
  onAddDocument: (file: File) => void;
  onRemoveDocument: (id: string) => void;
  onRemoveTenderDocument: (id: string) => void;
  onMoveDocumentToTender: (id: string) => void;
  onMoveTenderDocumentToBoq: (id: string) => void;
  isConfirmed: boolean;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onConfirmEmpty: () => void;
}

export function UnifiedRfqDocumentBucket(props: UnifiedRfqDocumentBucketProps) {
  const {
    pendingDocuments,
    pendingTenderDocuments,
    onAddDocument,
    onRemoveDocument,
    onRemoveTenderDocument,
    onMoveDocumentToTender,
    onMoveTenderDocumentToBoq,
    isConfirmed,
    onConfirm,
    onUnconfirm,
    onConfirmEmpty,
  } = props;

  const merged = useMemo<RoutedDocument[]>(
    () => [
      ...pendingDocuments.map<RoutedDocument>((doc) => ({ doc, routing: "boq" })),
      ...pendingTenderDocuments.map<RoutedDocument>((doc) => ({ doc, routing: "tender" })),
    ],
    [pendingDocuments, pendingTenderDocuments],
  );

  const totalCount = merged.length;
  const boqCount = pendingDocuments.length;
  const tenderCount = pendingTenderDocuments.length;

  const handleConfirmClick = () => {
    if (totalCount === 0) {
      onConfirmEmpty();
      return;
    }
    onConfirm();
  };

  const handleRemove = (entry: RoutedDocument) => {
    if (entry.routing === "boq") onRemoveDocument(entry.doc.id);
    else onRemoveTenderDocument(entry.doc.id);
  };

  const handleMove = (entry: RoutedDocument) => {
    if (entry.routing === "boq") onMoveDocumentToTender(entry.doc.id);
    else onMoveTenderDocumentToBoq(entry.doc.id);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">RFQ Documents</h3>
          <p className="text-xs text-gray-600">
            Drop the email (.eml), BOQ spreadsheet, drawings and tender specs — Nix sorts them for
            you.
          </p>
        </div>
      </div>

      {!isConfirmed ? (
        <>
          <DocumentDropzone
            documents={merged.map((entry) => entry.doc)}
            onAddDocument={onAddDocument}
            onRemoveDocument={(id) => {
              const entry = merged.find((e) => e.doc.id === id);
              if (entry) handleRemove(entry);
            }}
            maxDocuments={20}
            maxFileSizeMB={50}
          />

          {totalCount > 0 && (
            <div className="mt-3 space-y-1">
              {merged.map((entry) => (
                <RoutedRow
                  key={entry.doc.id}
                  entry={entry}
                  onRemove={() => handleRemove(entry)}
                  onMove={() => handleMove(entry)}
                />
              ))}
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-blue-200 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {totalCount === 0
                ? "No documents added yet"
                : `${boqCount} for BOQ/drawings · ${tenderCount} for tender specs`}
            </div>
            <button
              type="button"
              onClick={handleConfirmClick}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Confirm documents
            </button>
          </div>
        </>
      ) : (
        <div className="bg-green-50 border border-green-400 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Confirmed ({boqCount} BOQ/drawing · {tenderCount} tender)
            </div>
            <button
              type="button"
              onClick={onUnconfirm}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RoutedRowProps {
  entry: RoutedDocument;
  onRemove: () => void;
  onMove: () => void;
}

function RoutedRow(props: RoutedRowProps) {
  const { entry, onRemove, onMove } = props;
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const routing = entry.routing;
  const otherLabel = routing === "boq" ? "Tender Specs" : "BOQ / Drawings";
  const badgeClass =
    routing === "boq"
      ? "bg-blue-100 text-blue-700 border-blue-300"
      : "bg-purple-100 text-purple-700 border-purple-300";
  const badgeLabel = routing === "boq" ? "BOQ / Drawing" : "Tender Spec";

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-gray-200 text-sm">
      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badgeClass}`}>
        {badgeLabel}
      </span>
      <span className="text-gray-700 truncate flex-1" title={entry.doc.file.name}>
        {entry.doc.file.name}
      </span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMoveMenuOpen((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-800 underline"
        >
          Move to…
        </button>
        {moveMenuOpen && (
          <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded shadow-lg whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                setMoveMenuOpen(false);
                onMove();
              }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              {otherLabel}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
        title="Remove"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
