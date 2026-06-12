"use client";

import { toPairs as entries } from "es-toolkit/compat";
import type React from "react";
import { DocumentDropzone, type PendingDocument } from "@/app/components/uploads/DocumentDropzone";
import type { NixDocumentRole } from "../../api";
import type { SmartPendingDocument } from "./useSmartDocuments";

const ROLE_LABELS: Record<NixDocumentRole, string> = {
  drawing: "Drawing",
  specification: "Specification",
  other: "Other",
};

const ROLE_CHIP_STYLES: Record<NixDocumentRole, string> = {
  drawing: "bg-blue-100 text-blue-800 border-blue-300",
  specification: "bg-purple-100 text-purple-800 border-purple-300",
  other: "bg-gray-100 text-gray-700 border-gray-300",
};

export interface SmartDropzoneProps {
  title: string;
  subtitle?: string;
  documents: SmartPendingDocument[];
  onAddDocument: (file: File) => void;
  onRemoveDocument: (id: string) => void;
  onReclassify: (id: string, role: NixDocumentRole) => void;
  onProcess: () => void;
  isProcessing?: boolean;
  processingLabel?: string;
  processLabel?: string;
  maxDocuments?: number;
  maxFileSizeMB?: number;
  footer?: React.ReactNode;
}

// One dropzone for a mixed pack of drawings + specs + anything else
// (issue #266). Nix classifies each file's role on drop; the chip
// shows the guess and the dropdown lets the user override it before
// extraction. Internally the page still extracts drawings before
// specifications via extractionPassesOf so the cross-linking block
// keeps working — the buckets were a UI assist, not a backend need.
export function SmartDropzone(props: SmartDropzoneProps) {
  const documents = props.documents;
  const rawIsProcessing = props.isProcessing;
  const rawProcessLabel = props.processLabel;
  const rawProcessingLabel = props.processingLabel;
  const rawMaxDocuments = props.maxDocuments;
  const rawMaxFileSizeMB = props.maxFileSizeMB;
  const isProcessing = rawIsProcessing || false;
  const processLabel = rawProcessLabel || "Send to Nix";
  const processingLabel = rawProcessingLabel || "Nix is reading documents…";
  const maxDocuments = rawMaxDocuments || 20;
  const maxFileSizeMB = rawMaxFileSizeMB || 50;
  const byId = new Map(documents.map((doc) => [doc.id, doc]));

  const roleChip = (pending: PendingDocument) => {
    const doc = byId.get(pending.id);
    if (!doc) return null;
    const chipStyle = ROLE_CHIP_STYLES[doc.role];
    return (
      <span className="flex items-center gap-1">
        {doc.classifying ? (
          <span className="text-[10px] text-gray-400 italic animate-pulse">classifying…</span>
        ) : (
          <select
            value={doc.role}
            onChange={(event) => props.onReclassify(doc.id, event.target.value as NixDocumentRole)}
            disabled={isProcessing}
            title={`${doc.roleReason}${doc.roleSource === "user" ? "" : ` (auto: ${doc.roleSource})`} — change if wrong`}
            className={`text-[10px] font-medium border rounded-full px-1.5 py-0.5 cursor-pointer appearance-none ${chipStyle}`}
            aria-label={`Role for ${doc.file.name}`}
          >
            {entries(ROLE_LABELS).map(([value, label]: [string, string]) => (
              <option key={value} value={value}>
                {label}
                {doc.role === value && doc.roleSource !== "user" ? " (auto)" : ""}
              </option>
            ))}
          </select>
        )}
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-base font-bold text-gray-900">{props.title}</h3>
        {props.subtitle && <p className="text-xs text-gray-600 mt-0.5">{props.subtitle}</p>}
      </div>

      <DocumentDropzone
        documents={documents}
        onAddDocument={props.onAddDocument}
        onRemoveDocument={props.onRemoveDocument}
        maxDocuments={maxDocuments}
        maxFileSizeMB={maxFileSizeMB}
        renderDocumentExtra={roleChip}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-500">
          Nix tags each file as Drawing / Specification / Other — fix any wrong guess with the
          dropdown. Drawings always extract first so spec clauses cross-link to the codes they
          define.
        </p>
        <button
          type="button"
          onClick={props.onProcess}
          disabled={isProcessing || documents.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm whitespace-nowrap"
        >
          {isProcessing ? processingLabel : processLabel}
        </button>
      </div>

      {props.footer}
    </div>
  );
}
