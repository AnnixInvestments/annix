"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import type {
  OrbitComplianceGapResult,
  OrbitCredentialExpiryStatus,
  OrbitTalentCredential,
} from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitCandidateComplianceGap,
  useOrbitCandidateSiteReady,
  useOrbitCreateTalentCredential,
  useOrbitDeleteTalentCredential,
  useOrbitTalentCredentials,
  useOrbitTalentCredentialTypes,
  useOrbitUpdateTalentCredential,
} from "@/app/lib/query/hooks";
import { siteReadyMeta } from "./siteReadyMeta";
import { useOrbitAssistantProgress } from "./useOrbitAssistantProgress";

interface CandidatePassportPanelProps {
  candidateId: number;
}

const STATUS_META: Record<OrbitCredentialExpiryStatus, { label: string; classes: string }> = {
  valid: { label: "Valid", classes: "bg-green-100 text-green-700" },
  expiring: { label: "Expiring soon", classes: "bg-amber-100 text-amber-700" },
  expired: { label: "Expired", classes: "bg-red-100 text-red-700" },
  none: { label: "No expiry", classes: "bg-gray-100 text-gray-600" },
};

interface DraftState {
  credentialType: string;
  issuedAt: string;
  expiresAt: string;
  issuingAuthority: string;
  verified: boolean;
  notes: string;
}

const EMPTY_DRAFT: DraftState = {
  credentialType: "",
  issuedAt: "",
  expiresAt: "",
  issuingAuthority: "",
  verified: false,
  notes: "",
};

export function CandidatePassportPanel(props: CandidatePassportPanelProps) {
  const candidateId = props.candidateId;
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const credentialsQuery = useOrbitTalentCredentials(candidateId);
  const typesQuery = useOrbitTalentCredentialTypes();
  const siteReadyQuery = useOrbitCandidateSiteReady(candidateId);
  const gapMutation = useOrbitCandidateComplianceGap();
  const { run } = useOrbitAssistantProgress();
  const [gap, setGap] = useState<OrbitComplianceGapResult | null>(null);

  const runGapAnalysis = async () => {
    try {
      const result = await run("compliance-gap", "Orbit AI is assessing site-readiness…", () =>
        gapMutation.mutateAsync(candidateId),
      );
      setGap(result);
    } catch {
      showToast("The AI assessment failed. Please try again.", "error");
    }
  };
  const createMutation = useOrbitCreateTalentCredential();
  const updateMutation = useOrbitUpdateTalentCredential();
  const deleteMutation = useOrbitDeleteTalentCredential();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);

  const rawCredentials = credentialsQuery.data;
  const credentials = rawCredentials ?? [];
  const rawTypes = typesQuery.data;
  const types = rawTypes ?? [];
  const labelForCode = (code: string): string => {
    const match = types.find((t) => t.code === code);
    return match ? match.label : code;
  };
  const creating = createMutation.isPending;
  const updating = updateMutation.isPending;
  const isSaving = creating || updating;
  const siteReady = siteReadyQuery.data;
  const readyMeta = siteReady ? siteReadyMeta(siteReady.status) : null;

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = () => {
    const firstType = types[0];
    setDraft({ ...EMPTY_DRAFT, credentialType: firstType ? firstType.code : "" });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (credential: OrbitTalentCredential) => {
    const rawIssuedAt = credential.issuedAt;
    const rawExpiresAt = credential.expiresAt;
    const rawIssuingAuthority = credential.issuingAuthority;
    const rawNotes = credential.notes;
    setDraft({
      credentialType: credential.credentialType,
      issuedAt: rawIssuedAt ? rawIssuedAt.slice(0, 10) : "",
      expiresAt: rawExpiresAt ? rawExpiresAt.slice(0, 10) : "",
      issuingAuthority: rawIssuingAuthority ?? "",
      verified: credential.verified,
      notes: rawNotes ?? "",
    });
    setEditingId(credential.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const credentialType = draft.credentialType.trim();
    if (!credentialType) {
      showToast("Pick a credential type.", "error");
      return;
    }
    const issuedAt = draft.issuedAt;
    const expiresAt = draft.expiresAt;
    const issuingAuthority = draft.issuingAuthority.trim();
    const notes = draft.notes.trim();
    const payload = {
      credentialType,
      issuedAt: issuedAt || null,
      expiresAt: expiresAt || null,
      issuingAuthority: issuingAuthority || null,
      verified: draft.verified,
      notes: notes || null,
    };
    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({ candidateId, id: editingId, data: payload });
        showToast("Credential updated.", "success");
      } else {
        await createMutation.mutateAsync({ candidateId, data: payload });
        showToast("Credential added.", "success");
      }
      resetForm();
    } catch {
      showToast("Could not save the credential. Please try again.", "error");
    }
  };

  const handleDelete = async (credential: OrbitTalentCredential) => {
    const confirmed = await confirm({
      title: "Remove this credential?",
      message: `"${labelForCode(credential.credentialType)}" will be removed from this candidate's passport.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync({ candidateId, id: credential.id });
      showToast("Credential removed.", "success");
    } catch {
      showToast("Could not remove the credential. Please try again.", "error");
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-white/10 pt-5 mt-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#252560] dark:text-white">Skills Passport</h3>
          <p className="text-xs text-gray-500 dark:text-[#c0c0eb]">
            Tickets, medicals and certifications — expiry is tracked for site-readiness.
          </p>
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#323288] border border-[#c0c0eb] rounded-lg hover:bg-[#f0f0fb]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add credential
          </button>
        ) : null}
      </div>

      {siteReady && readyMeta ? (
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#252560] dark:text-white">
                Site-ready score
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${readyMeta.chipClasses}`}
              >
                {readyMeta.label}
              </span>
            </div>
            <span className="text-lg font-bold text-[#252560] dark:text-white">
              {siteReady.score}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${readyMeta.barClasses}`}
              style={{ width: `${siteReady.score}%` }}
            />
          </div>
          {siteReady.gaps.length > 0 ? (
            <p className="mt-2 text-xs text-gray-600 dark:text-[#c0c0eb]">
              <span className="font-medium">Missing to be site-ready: </span>
              {siteReady.gaps
                .map(
                  (gap) =>
                    `${labelForCode(gap.credentialType)} (${gap.status === "expired" ? "expired" : "expires soon"})`,
                )
                .join(", ")}
            </p>
          ) : siteReady.total > 0 ? (
            <p className="mt-2 text-xs text-green-700">All credentials valid.</p>
          ) : null}

          {siteReady.total > 0 ? (
            <div className="mt-3 border-t border-gray-100 dark:border-white/10 pt-2">
              <button
                type="button"
                onClick={runGapAnalysis}
                disabled={gapMutation.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#323288] hover:text-[#252560] disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {gapMutation.isPending ? "Assessing…" : "AI gap analysis"}
              </button>
              {gap ? (
                <div className="mt-2 rounded-lg bg-[#f7f7fd] dark:bg-white/5 p-2.5">
                  <p className="text-xs text-gray-700 dark:text-[#c0c0eb]">{gap.summary}</p>
                  {gap.suggestions.length > 0 ? (
                    <ul className="mt-1.5 space-y-1">
                      {gap.suggestions.map((suggestion) => (
                        <li
                          key={suggestion}
                          className="text-xs text-gray-600 dark:text-[#c0c0eb] flex gap-1.5"
                        >
                          <span className="text-[#323288]">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {credentialsQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading passport…</p>
      ) : credentials.length === 0 && !showForm ? (
        <p className="text-sm text-gray-500 dark:text-[#c0c0eb]">No credentials captured yet.</p>
      ) : (
        <ul className="space-y-2">
          {credentials.map((credential) => {
            const meta = STATUS_META[credential.status];
            return (
              <li
                key={credential.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[#252560] dark:text-white truncate">
                      {labelForCode(credential.credentialType)}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.classes}`}
                    >
                      {meta.label}
                    </span>
                    {credential.verified ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-700">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-[#c0c0eb]">
                    {credential.expiresAt
                      ? `Expires ${credential.expiresAt.slice(0, 10)}`
                      : "No expiry date"}
                    {credential.issuingAuthority ? ` · ${credential.issuingAuthority}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(credential)}
                    className="text-[#323288] hover:text-[#252560] text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(credential)}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm ? (
        <div className="mt-3 rounded-lg border border-[#c0c0eb] bg-[#f7f7fd] dark:bg-white/5 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#c0c0eb]">
                Credential type
              </span>
              <select
                value={draft.credentialType}
                onChange={(e) => setDraft({ ...draft, credentialType: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select a type…</option>
                {types.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#c0c0eb]">
                Issuing authority
              </span>
              <input
                type="text"
                value={draft.issuingAuthority}
                onChange={(e) => setDraft({ ...draft, issuingAuthority: e.target.value })}
                placeholder="e.g. Kathu Mine HSE"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#c0c0eb]">Issued</span>
              <DateInput
                value={draft.issuedAt}
                onChange={(value) => setDraft({ ...draft, issuedAt: value })}
                className="mt-1"
                ariaLabel="Issued date"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#c0c0eb]">Expires</span>
              <DateInput
                value={draft.expiresAt}
                onChange={(value) => setDraft({ ...draft, expiresAt: value })}
                className="mt-1"
                ariaLabel="Expiry date"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-[#c0c0eb]">
            <input
              type="checkbox"
              checked={draft.verified}
              onChange={(e) => setDraft({ ...draft, verified: e.target.checked })}
              className="rounded border-gray-300"
            />
            I have sighted and verified this credential
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-sm font-medium bg-[#323288] text-white rounded-lg hover:bg-[#252560] disabled:opacity-50"
            >
              {isSaving ? "Saving…" : editingId !== null ? "Save credential" : "Add credential"}
            </button>
          </div>
        </div>
      ) : null}

      {ConfirmDialog}
    </div>
  );
}
