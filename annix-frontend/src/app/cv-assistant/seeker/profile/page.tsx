"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IndividualDocument, IndividualDocumentKind } from "@/app/lib/api/cvAssistantApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useCvDeleteMyDocument,
  useCvMyDocuments,
  useCvMyProfileStatus,
} from "@/app/lib/query/hooks";
import { IndividualDocumentUploader } from "../components/IndividualDocumentUploader";
import { MissingDocsWarningModal } from "../components/MissingDocsWarningModal";

export default function SeekerProfilePage() {
  const router = useRouter();
  const statusQuery = useCvMyProfileStatus();
  const documentsQuery = useCvMyDocuments();
  const deleteMutation = useCvDeleteMyDocument();
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const status = statusQuery.data;
  const documentsData = documentsQuery.data;
  const documents = documentsData ? documentsData : [];
  const cvDocFound = documents.find((d) => d.kind === "cv");
  const cvDoc = cvDocFound ? cvDocFound : null;
  const qualifications = documents.filter((d) => d.kind === "qualification");
  const certificates = documents.filter((d) => d.kind === "certificate");
  const hasCv = status ? status.hasCv : false;
  const qualificationsCount = status ? status.qualificationsCount : 0;
  const certificatesCount = status ? status.certificatesCount : 0;
  const cvUploadedAt = status ? status.cvUploadedAt : null;

  const handleStartSearch = () => {
    if (!status) return;
    if (qualificationsCount === 0 || certificatesCount === 0) {
      setWarningOpen(true);
      return;
    }
    router.push("/cv-assistant/seeker/jobs");
  };

  const handleConfirmContinue = () => {
    setWarningOpen(false);
    router.push("/cv-assistant/seeker/jobs");
  };

  const handleDelete = (doc: IndividualDocument) => {
    setDeleteError(null);
    setPendingDeleteId(doc.id);
    deleteMutation.mutate(doc.id, {
      onSuccess: () => setPendingDeleteId(null),
      onError: (err) => {
        setPendingDeleteId(null);
        setDeleteError(err instanceof Error ? err.message : "Delete failed");
      },
    });
  };

  const isStatusLoading = statusQuery.isLoading;
  const isDocumentsLoading = documentsQuery.isLoading;
  if (isStatusLoading || isDocumentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My CV &amp; Documents</h1>
        <p className="text-gray-600 mt-2">
          {hasCv
            ? "Keep your CV current and add qualifications or certificates so we can match you to better jobs."
            : "Upload your CV to get started — we will use it to find jobs you are qualified for."}
        </p>
      </div>

      {!hasCv && <CvRequiredBanner />}

      <SectionCard
        title="Your CV"
        description="Required. We extract your skills, experience, and education from this file."
      >
        {cvDoc ? <CurrentCvCard doc={cvDoc} cvUploadedAt={cvUploadedAt} /> : null}
        <IndividualDocumentUploader
          kind="cv"
          ctaLabel={cvDoc ? "Replace CV" : "Upload CV"}
          helperText="PDF works best. Word, Excel, or PowerPoint also accepted (10 MB max). Replacing your CV will overwrite the old version."
        />
      </SectionCard>

      <SectionCard
        title="Qualifications"
        description="Optional but strongly recommended. Degrees, diplomas, transcripts — one file per qualification."
        badge={qualifications.length > 0 ? `${qualifications.length} uploaded` : "Optional"}
      >
        <DocumentList
          documents={qualifications}
          emptyMessage="No qualifications uploaded yet."
          onDelete={handleDelete}
          pendingDeleteId={pendingDeleteId}
        />
        <IndividualDocumentUploader
          kind="qualification"
          ctaLabel={
            qualifications.length > 0 ? "Add another qualification" : "Upload qualification"
          }
        />
      </SectionCard>

      <SectionCard
        title="Certificates"
        description="Optional but strongly recommended. Professional certifications, licenses, training certificates."
        badge={certificates.length > 0 ? `${certificates.length} uploaded` : "Optional"}
      >
        <DocumentList
          documents={certificates}
          emptyMessage="No certificates uploaded yet."
          onDelete={handleDelete}
          pendingDeleteId={pendingDeleteId}
        />
        <IndividualDocumentUploader
          kind="certificate"
          ctaLabel={certificates.length > 0 ? "Add another certificate" : "Upload certificate"}
        />
      </SectionCard>

      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {deleteError}
        </div>
      )}

      {hasCv && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Profile ready</h3>
            <p className="text-sm text-gray-600 mt-1">
              You can start searching now. Add more qualifications or certificates any time to
              improve your matches.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartSearch}
            className="bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors whitespace-nowrap"
          >
            Start job search
          </button>
        </div>
      )}

      <MissingDocsWarningModal
        isOpen={warningOpen}
        missingQualifications={qualificationsCount === 0}
        missingCertificates={certificatesCount === 0}
        onCancel={() => setWarningOpen(false)}
        onConfirm={handleConfirmContinue}
      />
    </div>
  );
}

function CvRequiredBanner() {
  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 bg-violet-100 rounded-full flex-shrink-0">
        <svg
          className="w-4 h-4 text-violet-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-violet-900">Upload your CV to get started</p>
        <p className="text-xs text-violet-700 mt-1">
          We need a CV before we can find jobs for you. Qualifications and certificates are optional
          but make matches more accurate.
        </p>
      </div>
    </div>
  );
}

function SectionCard(props: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{props.description}</p>
        </div>
        {props.badge && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
            {props.badge}
          </span>
        )}
      </div>
      <div className="space-y-3">{props.children}</div>
    </div>
  );
}

function CurrentCvCard(props: { doc: IndividualDocument; cvUploadedAt: string | null }) {
  const propsCvUploadedAt = props.cvUploadedAt;
  const docUploadedAt = props.doc.uploadedAt;
  const uploadedAt = propsCvUploadedAt ? propsCvUploadedAt : docUploadedAt;
  const sizeKb = Math.round(props.doc.sizeBytes / 1024);
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <FileBadge kind="cv" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{props.doc.originalFilename}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {sizeKb} KB · uploaded {formatDate(uploadedAt)}
          </p>
        </div>
      </div>
      <a
        href={props.doc.downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-violet-600 hover:text-violet-700 font-medium whitespace-nowrap"
      >
        View
      </a>
    </div>
  );
}

function DocumentList(props: {
  documents: IndividualDocument[];
  emptyMessage: string;
  onDelete: (doc: IndividualDocument) => void;
  pendingDeleteId: number | null;
}) {
  if (props.documents.length === 0) {
    return <p className="text-sm text-gray-500 italic">{props.emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {props.documents.map((doc) => {
        const isDeleting = props.pendingDeleteId === doc.id;
        const sizeKb = Math.round(doc.sizeBytes / 1024);
        return (
          <li
            key={doc.id}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileBadge kind={doc.kind} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.originalFilename}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sizeKb} KB · uploaded {formatDate(doc.uploadedAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <a
                href={doc.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => props.onDelete(doc)}
                disabled={isDeleting}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function FileBadge(props: { kind: IndividualDocumentKind }) {
  const palette =
    props.kind === "cv"
      ? "bg-violet-100 text-violet-700"
      : props.kind === "qualification"
        ? "bg-blue-100 text-blue-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${palette}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
  );
}

function formatDate(value: string): string {
  return formatDateZA(value);
}
