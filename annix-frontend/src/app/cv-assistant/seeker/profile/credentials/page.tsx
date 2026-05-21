"use client";

import {
  CREDENTIAL_LABELS,
  CREDENTIAL_TYPES,
  type CredentialType,
} from "@annix/product-data/sa-market";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { SeekerCredential, SeekerCredentialInput } from "@/app/lib/api/annixOrbitApi";
import { DateTime, fromISO } from "@/app/lib/datetime";
import {
  useCvAutofillSeekerCredentials,
  useCvCreateSeekerCredential,
  useCvDeleteSeekerCredential,
  useCvSeekerCredentials,
  useCvUpdateSeekerCredential,
} from "@/app/lib/query/hooks";

export default function SeekerCredentialsPage() {
  const { showToast } = useToast();
  const query = useCvSeekerCredentials();
  const createMutation = useCvCreateSeekerCredential();
  const updateMutation = useCvUpdateSeekerCredential();
  const deleteMutation = useCvDeleteSeekerCredential();
  const autofillMutation = useCvAutofillSeekerCredentials();

  const [draft, setDraft] = useState<SeekerCredentialInput>(emptyDraft());

  const data = query.data;
  const credentials = data ? data.credentials : [];

  const handleCreate = () => {
    if (!draft.credentialType) {
      showToast("Pick a credential type first", "error");
      return;
    }
    createMutation.mutate(draft, {
      onSuccess: () => {
        showToast("Credential added", "success");
        setDraft(emptyDraft());
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

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => showToast("Credential deleted", "success"),
      onError: () => showToast("Could not delete credential", "error"),
    });
  };

  const handleAutofill = () => {
    autofillMutation.mutate(undefined, {
      onSuccess: (result) => {
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
      onError: () => showToast("Auto-fill failed — add credentials manually", "error"),
    });
  };

  if (query.isLoading) {
    return <div className="p-6 text-gray-500">Loading…</div>;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-700">Type</span>
            <select
              value={draft.credentialType}
              onChange={(e) =>
                setDraft({ ...draft, credentialType: e.target.value as CredentialType })
              }
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {CREDENTIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CREDENTIAL_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Issued</span>
            <input
              type="date"
              value={emptyIfNull(draft.issuedAt)}
              onChange={(e) => setDraft({ ...draft, issuedAt: stringOrNull(e.target.value) })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Expires</span>
            <input
              type="date"
              value={emptyIfNull(draft.expiresAt)}
              onChange={(e) => setDraft({ ...draft, expiresAt: stringOrNull(e.target.value) })}
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
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
            {credentials.map((credential) => (
              <CredentialRow
                key={credential.id}
                credential={credential}
                onUpdate={(patch) => handleUpdate(credential.id, patch)}
                onDelete={() => handleDelete(credential.id)}
                isPending={
                  (updateMutation.isPending && updateMutation.variables?.id === credential.id) ||
                  (deleteMutation.isPending && deleteMutation.variables === credential.id)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface CredentialRowProps {
  credential: SeekerCredential;
  onUpdate: (patch: Partial<SeekerCredentialInput>) => void;
  onDelete: () => void;
  isPending: boolean;
}

function CredentialRow(props: CredentialRowProps) {
  const { credential, onUpdate, onDelete, isPending } = props;
  const expiryStatus = classifyExpiry(credential.expiresAt);
  const badgeClasses = badgeClassFor(expiryStatus);
  const issuingAuthorityLabel = credential.issuingAuthority
    ? credential.issuingAuthority
    : "No issuing authority";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center p-2 border border-gray-100 rounded-lg">
      <div className="sm:col-span-2">
        <div className="text-sm font-medium text-gray-900">
          {CREDENTIAL_LABELS[credential.credentialType]}
        </div>
        <div className="text-xs text-gray-500">{issuingAuthorityLabel}</div>
      </div>
      <div>
        <label className="block">
          <span className="text-xs text-gray-500">Issued</span>
          <input
            type="date"
            value={emptyIfNull(credential.issuedAt)}
            onBlur={(e) => onUpdate({ issuedAt: stringOrNull(e.target.value) })}
            defaultValue={emptyIfNull(credential.issuedAt)}
            className="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-xs"
          />
        </label>
      </div>
      <div>
        <label className="block">
          <span className="text-xs text-gray-500">Expires</span>
          <input
            type="date"
            value={emptyIfNull(credential.expiresAt)}
            onBlur={(e) => onUpdate({ expiresAt: stringOrNull(e.target.value) })}
            defaultValue={emptyIfNull(credential.expiresAt)}
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
