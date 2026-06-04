"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { IndividualDocument, IndividualDocumentKind } from "@/app/lib/api/annixOrbitApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitDeleteMyDocument,
  useOrbitMyDocuments,
  useOrbitMyProfileStatus,
} from "@/app/lib/query/hooks";
import { IndividualDocumentUploader } from "../components/IndividualDocumentUploader";
import { MissingDocsWarningModal } from "../components/MissingDocsWarningModal";
import { NixWizardPanel } from "../components/NixWizardPanel";

export default function SeekerProfilePage() {
  const router = useRouter();
  const statusQuery = useOrbitMyProfileStatus();
  const documentsQuery = useOrbitMyDocuments();
  const deleteMutation = useOrbitDeleteMyDocument();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [nixAutoRunKey, setNixAutoRunKey] = useState(0);

  useEffect(() => {
    const statusLoading = statusQuery.isLoading;
    const documentsLoading = documentsQuery.isLoading;
    if (statusLoading || documentsLoading) return;
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [statusQuery.isLoading, documentsQuery.isLoading]);

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
    router.push("/annix/orbit/seeker/jobs");
  };

  const handleConfirmContinue = () => {
    setWarningOpen(false);
    router.push("/annix/orbit/seeker/jobs");
  };

  const handleDelete = async (doc: IndividualDocument) => {
    const isCv = doc.kind === "cv";
    const confirmed = await confirm({
      title: isCv ? "Delete your CV?" : "Delete this document?",
      message: isCv
        ? "Your CV will be permanently removed and job matching will stop until you upload a new one. This cannot be undone."
        : "It will be permanently removed from your profile. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setPendingDeleteId(doc.id);
    deleteMutation.mutate(doc.id, {
      onSuccess: () => setPendingDeleteId(null),
      onError: () => {
        setPendingDeleteId(null);
        showToast("Couldn't delete the document — please try again.", "error");
      },
    });
  };

  const isStatusLoading = statusQuery.isLoading;
  const isDocumentsLoading = documentsQuery.isLoading;
  const isStatusError = statusQuery.isError;
  const isDocumentsError = documentsQuery.isError;
  if (isStatusLoading || isDocumentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-navbar,#323288)]" />
      </div>
    );
  }

  if (isStatusError || isDocumentsError) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your profile right now. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My CV &amp; Documents</h1>
        <p className="text-white/70 mt-2">
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
        {cvDoc ? (
          <CurrentCvCard
            doc={cvDoc}
            cvUploadedAt={cvUploadedAt}
            onDelete={handleDelete}
            isDeleting={pendingDeleteId === cvDoc.id}
          />
        ) : null}
        <IndividualDocumentUploader
          kind="cv"
          ctaLabel={cvDoc ? "Replace CV" : "Upload CV"}
          helperText="PDF works best. Word, Excel, or PowerPoint also accepted (10 MB max). Replacing your CV will overwrite the old version."
          onUploaded={() => setNixAutoRunKey((k) => k + 1)}
        />
      </SectionCard>

      <NixWizardPanel hasCv={hasCv} autoRunKey={nixAutoRunKey} />

      <SectionCard
        id="qualifications"
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
        id="certificates"
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

      {hasCv && (
        <div className="bg-white rounded-xl border border-[var(--brand-navbar-100,#e0e0f5)] px-2 py-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            className="bg-[var(--brand-navbar,#323288)] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] transition-colors whitespace-nowrap"
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
      {ConfirmDialog}
    </div>
  );
}

function CvRequiredBanner() {
  return (
    <div className="bg-[var(--brand-navbar-50,#f0f0fc)] border border-[var(--brand-navbar-200,#c0c0eb)] rounded-xl p-4 flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 bg-[var(--brand-navbar-100,#e0e0f5)] rounded-full flex-shrink-0">
        <svg
          className="w-4 h-4 text-[var(--brand-navbar,#323288)]"
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
        <p className="text-sm font-medium text-[var(--brand-grad-from,#1a1a40)]">
          Upload your CV to get started
        </p>
        <p className="text-xs text-[var(--brand-navbar-active,#252560)] mt-1">
          We need a CV before we can find jobs for you. Qualifications and certificates are optional
          but make matches more accurate.
        </p>
      </div>
    </div>
  );
}

function SectionCard(props: {
  id?: string;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={props.id}
      className="bg-white rounded-xl border border-[var(--brand-navbar-100,#e0e0f5)] px-2 py-4 sm:p-6 space-y-4 scroll-mt-24"
    >
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

function CurrentCvCard(props: {
  doc: IndividualDocument;
  cvUploadedAt: string | null;
  onDelete: (doc: IndividualDocument) => void;
  isDeleting: boolean;
}) {
  const propsCvUploadedAt = props.cvUploadedAt;
  const docUploadedAt = props.doc.uploadedAt;
  const uploadedAt = propsCvUploadedAt ? propsCvUploadedAt : docUploadedAt;
  const sizeKb = Math.round(props.doc.sizeBytes / 1024);
  return (
    <div className="bg-gray-50 border border-[var(--brand-navbar-100,#e0e0f5)] rounded-lg px-2.5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <FileBadge kind="cv" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{props.doc.originalFilename}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {sizeKb} KB · uploaded {formatDate(uploadedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <a
          href={props.doc.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] font-medium whitespace-nowrap"
        >
          View
        </a>
        <button
          type="button"
          onClick={() => props.onDelete(props.doc)}
          disabled={props.isDeleting}
          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {props.isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
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
            className="bg-gray-50 border border-[var(--brand-navbar-100,#e0e0f5)] rounded-lg px-2.5 py-4 flex items-center justify-between gap-4"
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
                className="text-sm text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] font-medium"
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
      ? "bg-[var(--brand-navbar-100,#e0e0f5)] text-[var(--brand-navbar-active,#252560)]"
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
