"use client";

import {
  CREDENTIAL_DESCRIPTIONS,
  CREDENTIAL_LABELS,
  CREDENTIAL_TYPES,
} from "@annix/product-data/sa-market";
import { useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import { DocumentDropzone, type PendingDocument } from "@/app/components/uploads/DocumentDropzone";
import type { SeekerCredential, SeekerCredentialInput } from "@/app/lib/api/annixOrbitApi";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { DateTime, fromISO } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitAutofillSeekerCredentials,
  useOrbitCreateSeekerCredential,
  useOrbitCredentialTypes,
  useOrbitDeleteSeekerCredential,
  useOrbitExtractCredentialDocument,
  useOrbitSeekerCredentials,
  useOrbitUpdateSeekerCredential,
} from "@/app/lib/query/hooks";

export default function SeekerCredentialsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const query = useOrbitSeekerCredentials();
  const createMutation = useOrbitCreateSeekerCredential();
  const updateMutation = useOrbitUpdateSeekerCredential();
  const deleteMutation = useOrbitDeleteSeekerCredential();
  const autofillMutation = useOrbitAutofillSeekerCredentials();
  const extractDocMutation = useOrbitExtractCredentialDocument();
  const { showExtraction, hideExtraction } = useExtractionProgress();

  const [draft, setDraft] = useState<SeekerCredentialInput>(emptyDraft());
  const [certDocs, setCertDocs] = useState<PendingDocument[]>([]);

  const data = query.data;
  const credentials = data ? data.credentials : [];

  const typesQuery = useOrbitCredentialTypes();
  const fetchedTypes = typesQuery.data;
  const typeOptions =
    fetchedTypes && fetchedTypes.length > 0
      ? fetchedTypes.map((t) => ({ code: t.code, label: t.label, description: t.description }))
      : CREDENTIAL_TYPES.map((code) => ({
          code: code as string,
          label: CREDENTIAL_LABELS[code],
          description: CREDENTIAL_DESCRIPTIONS[code] as string | null,
        }));
  const labelByCode = new Map(typeOptions.map((option) => [option.code, option.label]));
  const descriptionByCode = new Map(typeOptions.map((option) => [option.code, option.description]));
  const selectedDescriptionRaw = descriptionByCode.get(draft.credentialType);
  const selectedTypeDescription = selectedDescriptionRaw ?? null;

  const handleCreate = () => {
    if (!draft.credentialType) {
      showToast("Pick a credential type first", "error");
      return;
    }
    if (!isValidDateOrder(draft.issuedAt, draft.expiresAt)) {
      showToast("The expiry date can't be before the issue date", "error");
      return;
    }
    createMutation.mutate(draft, {
      onSuccess: () => {
        showToast("Credential added", "success");
        setDraft(emptyDraft());
        setCertDocs([]);
      },
      onError: () => showToast("Could not add credential", "error"),
    });
  };

  const handleUpdate = (id: number, patch: Partial<SeekerCredentialInput>) => {
    updateMutation.mutate(
      { id, input: patch },
      {
        onSuccess: () => showToast("Credential updated", "success"),
        onError: () => showToast("Could not update credential", "error"),
      },
    );
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete this credential?",
      message: "It will be removed from your credentials list. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    deleteMutation.mutate(id, {
      onSuccess: () => showToast("Credential deleted", "success"),
      onError: () => showToast("Could not delete credential", "error"),
    });
  };

  const handleCertificateDrop = async (file: File) => {
    setCertDocs([{ file, id: file.name }]);
    const stats = await metricsApi
      .extractionStats("orbit-credential-extract", "document")
      .catch(() => null);
    const averageMs = stats?.averageMs;
    const estimatedDurationMs = averageMs || 12000;
    showExtraction({
      brand: "annix-orbit",
      label: "Nix is reading your certificate…",
      estimatedDurationMs,
    });
    try {
      const result = await extractDocMutation.mutateAsync(file);
      const { credentialType, issuedAt, expiresAt, issuingAuthority, notes } = result;
      setDraft((prev) => ({
        ...prev,
        credentialType: credentialType || prev.credentialType,
        issuedAt: issuedAt || prev.issuedAt,
        expiresAt: expiresAt || prev.expiresAt,
        issuingAuthority: issuingAuthority || prev.issuingAuthority,
        notes: notes || prev.notes,
      }));
      showToast("Certificate read — review the details below, then add it", "success");
    } catch {
      showToast("Couldn't read that certificate — please fill the form in manually", "error");
    } finally {
      hideExtraction();
    }
  };

  const handleAutofill = async () => {
    const stats = await metricsApi
      .extractionStats("orbit-credential-extract", "cv-autofill")
      .catch(() => null);
    const averageMs = stats?.averageMs;
    const estimatedDurationMs = averageMs || 12000;
    showExtraction({
      brand: "annix-orbit",
      label: "Nix is reading your CV for credentials…",
      estimatedDurationMs,
    });
    autofillMutation.mutate(undefined, {
      onSuccess: (result) => {
        hideExtraction();
        if (result.created > 0) {
          showToast(
            `Added ${result.created} credential${result.created === 1 ? "" : "s"} from your CV`,
            "success",
          );
          return;
        }
        const reason = result.reason;
        if (reason === "no-cv-text") {
          showToast("Upload a CV first so we can scan it for credentials", "info");
        } else if (reason === "no-credential-keywords") {
          showToast("Your CV doesn't mention any credentials we can extract", "info");
        } else if (reason === "no-candidate") {
          showToast("Upload a CV first", "info");
        } else if (reason === "ai-failed") {
          showToast("Couldn't read credentials from your CV — add them manually", "error");
        } else {
          showToast("No new credentials found in your CV", "info");
        }
      },
      onError: () => {
        hideExtraction();
        showToast("Auto-fill failed — add credentials manually", "error");
      },
    });
  };

  if (query.isLoading) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  if (query.isError) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your credentials right now. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credentials &amp; tickets</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track your medical, mine inductions, blasting tickets and other deployment credentials.
            You'll get an email 30, 14, and 1 day before any expire so you can renew in time.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAutofill}
          disabled={autofillMutation.isPending}
          className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
        >
          {autofillMutation.isPending ? "Reading CV…" : "Auto-fill from my CV"}
        </button>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Add a credential</h2>
        <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 p-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-800">Have the certificate handy?</p>
            <p className="text-xs text-gray-500">
              Drop a PDF or photo and Nix will read it and fill in the details below.
            </p>
          </div>
          <DocumentDropzone
            documents={certDocs}
            onAddDocument={handleCertificateDrop}
            onRemoveDocument={(id) => setCertDocs((prev) => prev.filter((doc) => doc.id !== id))}
            maxDocuments={1}
            maxFileSizeMB={15}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-700">Type</span>
            <select
              value={draft.credentialType}
              onChange={(e) => setDraft({ ...draft, credentialType: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {typeOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedTypeDescription && (
              <span className="mt-1 block text-xs text-gray-500">{selectedTypeDescription}</span>
            )}
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Issued</span>
            <DateInput
              value={emptyIfNull(draft.issuedAt)}
              onChange={(value) => setDraft({ ...draft, issuedAt: stringOrNull(value) })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Expires</span>
            <DateInput
              value={emptyIfNull(draft.expiresAt)}
              onChange={(value) => setDraft({ ...draft, expiresAt: stringOrNull(value) })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-700">Issuing authority</span>
            <input
              type="text"
              value={emptyIfNull(draft.issuingAuthority)}
              onChange={(e) =>
                setDraft({ ...draft, issuingAuthority: stringOrNull(e.target.value) })
              }
              placeholder="e.g. Kathu Mine HSE, Dr. Smith"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-700">Notes (optional)</span>
            <input
              type="text"
              value={emptyIfNull(draft.notes)}
              onChange={(e) => setDraft({ ...draft, notes: stringOrNull(e.target.value) })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50"
          >
            {createMutation.isPending ? "Adding…" : "Add credential"}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Your credentials</h2>
        {credentials.length === 0 ? (
          <p className="text-sm text-gray-500">
            No credentials tracked yet. Add your medical certificate above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {credentials.map((credential) => {
              const rawLabel = labelByCode.get(credential.credentialType);
              const label = rawLabel || credential.credentialType;
              return (
                <CredentialRow
                  key={credential.id}
                  credential={credential}
                  label={label}
                  onUpdate={(patch) => handleUpdate(credential.id, patch)}
                  onDelete={() => handleDelete(credential.id)}
                  onInvalidDateOrder={() =>
                    showToast("The expiry date can't be before the issue date", "error")
                  }
                  isPending={
                    (updateMutation.isPending && updateMutation.variables?.id === credential.id) ||
                    (deleteMutation.isPending && deleteMutation.variables === credential.id)
                  }
                />
              );
            })}
          </div>
        )}
      </section>
      {ConfirmDialog}
    </div>
  );
}

interface CredentialRowProps {
  credential: SeekerCredential;
  label: string;
  onUpdate: (patch: Partial<SeekerCredentialInput>) => void;
  onDelete: () => void;
  onInvalidDateOrder: () => void;
  isPending: boolean;
}

function CredentialRow(props: CredentialRowProps) {
  const { credential, label, onUpdate, onDelete, onInvalidDateOrder, isPending } = props;
  const expiryStatus = classifyExpiry(credential.expiresAt);
  const badgeClasses = badgeClassFor(expiryStatus);
  const issuingAuthorityLabel = credential.issuingAuthority
    ? credential.issuingAuthority
    : "No issuing authority";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center p-2 border border-gray-100 rounded-lg">
      <div className="sm:col-span-2">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{issuingAuthorityLabel}</div>
      </div>
      <div>
        <label className="block">
          <span className="text-xs text-gray-500">Issued</span>
          <input
            type="date"
            defaultValue={emptyIfNull(credential.issuedAt)}
            onBlur={(e) => {
              const next = stringOrNull(e.target.value);
              if (next === credential.issuedAt) return;
              if (!isValidDateOrder(next, credential.expiresAt)) {
                e.target.value = emptyIfNull(credential.issuedAt);
                onInvalidDateOrder();
                return;
              }
              onUpdate({ issuedAt: next });
            }}
            className="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-xs"
          />
        </label>
      </div>
      <div>
        <label className="block">
          <span className="text-xs text-gray-500">Expires</span>
          <input
            type="date"
            defaultValue={emptyIfNull(credential.expiresAt)}
            onBlur={(e) => {
              const next = stringOrNull(e.target.value);
              if (next === credential.expiresAt) return;
              if (!isValidDateOrder(credential.issuedAt, next)) {
                e.target.value = emptyIfNull(credential.expiresAt);
                onInvalidDateOrder();
                return;
              }
              onUpdate({ expiresAt: next });
            }}
            className="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-xs"
          />
        </label>
      </div>
      <div>
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badgeClasses}`}>
          {expiryStatus.label}
        </span>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface ExpiryStatus {
  bucket: "expired" | "imminent" | "soon" | "valid" | "unknown";
  label: string;
}

function classifyExpiry(expiresAt: string | null): ExpiryStatus {
  if (!expiresAt) return { bucket: "unknown", label: "No expiry set" };
  const expires = fromISO(expiresAt);
  if (!expires.isValid) return { bucket: "unknown", label: "Invalid date" };
  const now = DateTime.now().startOf("day");
  const daysUntil = Math.round(expires.diff(now, "days").days);
  if (daysUntil < 0) return { bucket: "expired", label: `Expired ${Math.abs(daysUntil)}d ago` };
  if (daysUntil <= 14) return { bucket: "imminent", label: `Expires in ${daysUntil}d` };
  if (daysUntil <= 60) return { bucket: "soon", label: `Expires in ${daysUntil}d` };
  return { bucket: "valid", label: `Valid for ${daysUntil}d` };
}

function badgeClassFor(status: ExpiryStatus): string {
  if (status.bucket === "expired") return "bg-red-100 text-red-700 border border-red-300";
  if (status.bucket === "imminent") return "bg-amber-100 text-amber-800 border border-amber-300";
  if (status.bucket === "soon") return "bg-yellow-50 text-yellow-800 border border-yellow-200";
  if (status.bucket === "valid") return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

function emptyDraft(): SeekerCredentialInput {
  return {
    credentialType: "medical",
    issuedAt: null,
    expiresAt: null,
    issuingAuthority: null,
    documentPath: null,
    notes: null,
  };
}

function emptyIfNull(value: string | null | undefined): string {
  return value == null ? "" : value;
}

function stringOrNull(value: string): string | null {
  return value === "" ? null : value;
}

function isValidDateOrder(
  issuedAt: string | null | undefined,
  expiresAt: string | null | undefined,
): boolean {
  if (!issuedAt || !expiresAt) return true;
  return fromISO(issuedAt).toMillis() <= fromISO(expiresAt).toMillis();
}
