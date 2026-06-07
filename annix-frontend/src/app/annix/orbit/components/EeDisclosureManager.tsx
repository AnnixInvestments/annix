"use client";

import { useQuery } from "@tanstack/react-query";
import { isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EeDisclosureFields } from "@/app/annix/orbit/components/EeDisclosureFields";
import {
  DEFAULT_EE_FORM_STATE,
  type EeDisclosureFormState,
  eeFormStateFromAttributes,
  eePurposesFromState,
} from "@/app/annix/orbit/config/ee-options";
import { annixOrbitApiClient, type EePopulationGroupKey } from "@/app/lib/api/annixOrbitApi";
import { BrandedLoader } from "@/app/lib/branding/components/BrandedLoader";
import { fromISO } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useDeleteMyEeAttributes,
  useMyEeAttributes,
  useUpdateMyEeAttributes,
} from "@/app/lib/query/hooks";

function serverMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const jsonStart = error.message.indexOf("{");
  if (jsonStart < 0) return fallback;
  try {
    const body = JSON.parse(error.message.slice(jsonStart)) as { message?: unknown };
    const message = body.message;
    if (isString(message) && message.trim().length > 0) return message;
    if (isArray(message) && message.length > 0) return String(message[0]);
    return fallback;
  } catch {
    return fallback;
  }
}

export function EeDisclosureManager() {
  const { data, isLoading, isError } = useMyEeAttributes();
  const { confirm, ConfirmDialog } = useConfirm();
  const updateMutation = useUpdateMyEeAttributes();
  const deleteMutation = useDeleteMyEeAttributes();

  const [form, setForm] = useState<EeDisclosureFormState>(DEFAULT_EE_FORM_STATE);
  const [purposesError, setPurposesError] = useState(false);
  const [prefilledFromEarlyAccess, setPrefilledFromEarlyAccess] = useState(false);

  const suggestionQuery = useQuery({
    queryKey: ["orbit-ee-suggestion"],
    queryFn: () => annixOrbitApiClient.eeAttributesSuggestion(),
  });

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (isLoading) return;
    if (data) {
      hydratedRef.current = true;
      setForm(eeFormStateFromAttributes(data));
      return;
    }
    const suggestion = suggestionQuery.data;
    const suggestedPopulationGroup = suggestion ? suggestion.populationGroup : null;
    if (suggestedPopulationGroup) {
      hydratedRef.current = true;
      setPrefilledFromEarlyAccess(true);
      setForm((prev) => ({
        ...prev,
        populationGroup: suggestedPopulationGroup as EePopulationGroupKey,
      }));
    }
  }, [data, isLoading, suggestionQuery.data]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const purposes = eePurposesFromState(form);
    if (purposes.length === 0) {
      setPurposesError(true);
      await confirm({
        title: "Choose at least one purpose",
        message: "Tick at least one purpose, or choose Withdraw to remove your disclosure.",
        confirmLabel: "OK",
        hideCancel: true,
        variant: "warning",
      });
      return;
    }
    setPurposesError(false);
    try {
      await updateMutation.mutateAsync({
        populationGroup: form.populationGroup,
        gender: form.gender,
        disabilityStatus: form.disabilityStatus,
        requiresAccommodation: form.requiresAccommodation,
        accommodationNotes: form.accommodationNotes.trim() || null,
        nationalityStatus: form.nationalityStatus,
        consentTextVersionId: null,
        purposes,
      });
      await confirm({
        title: "Disclosure updated",
        message: "Your Employment Equity disclosure has been saved.",
        confirmLabel: "Done",
        hideCancel: true,
        variant: "info",
      });
    } catch (err) {
      await confirm({
        title: "Couldn't update disclosure",
        message: serverMessage(err, "Please try again in a moment."),
        confirmLabel: "OK",
        hideCancel: true,
        variant: "warning",
      });
    }
  };

  const onWithdraw = async () => {
    const ok = await confirm({
      title: "Withdraw EE disclosure?",
      message:
        "This removes your demographic disclosure from your profile and tombstones it on every job you've applied to. You can re-disclose at any time.",
      confirmLabel: "Withdraw",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync();
      setForm(DEFAULT_EE_FORM_STATE);
      hydratedRef.current = false;
      await confirm({
        title: "Disclosure withdrawn",
        message:
          "Your demographic disclosure has been removed. You can re-disclose at any time from this page.",
        confirmLabel: "Done",
        hideCancel: true,
        variant: "info",
      });
    } catch (err) {
      await confirm({
        title: "Couldn't withdraw disclosure",
        message: serverMessage(err, "Please try again in a moment."),
        confirmLabel: "OK",
        hideCancel: true,
        variant: "warning",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <BrandedLoader brand="annix-orbit" label="Loading your disclosure…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          We couldn't load your disclosure right now. Please refresh the page — don't re-submit
          until it loads, so you don't create a duplicate.
        </div>
      </div>
    );
  }

  const rawConsentGrantedAt = data?.consentGrantedAt;
  const consentGrantedAt = rawConsentGrantedAt ? fromISO(rawConsentGrantedAt) : null;
  const lastUpdatedLabel = consentGrantedAt?.isValid
    ? consentGrantedAt.toFormat("dd MMM yyyy HH:mm")
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employment Equity disclosure</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Voluntary. Used only for Employment Equity Act reporting and AI-screening fairness
          monitoring. Stored separately from your CV; never used by the candidate ranker.
        </p>
        <p className="text-gray-500 mt-1 text-sm">
          See the{" "}
          <Link href="/annix/orbit/seeker/ee-attributes/privacy-notice" className="underline">
            privacy notice
          </Link>{" "}
          for purpose limitation, retention, and withdrawal mechanics.
        </p>
      </header>

      {data ? (
        <p className="text-sm text-gray-600 mb-4">
          {lastUpdatedLabel ? `Last updated: ${lastUpdatedLabel}` : "Disclosure on file."}
          {data.consentTextVersionId ? ` · consent text v${data.consentTextVersionId}` : ""}
        </p>
      ) : (
        <p className="text-sm text-gray-600 mb-4">
          You haven't disclosed yet. Your choices are saved to your profile and applied to every job
          you apply to.
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-6 bg-white rounded-lg border border-gray-200 p-4"
      >
        {prefilledFromEarlyAccess ? (
          <p className="rounded-md bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-800">
            We've pre-filled your population group from your early-access registration — please
            review and confirm, or change it. Nothing is saved until you submit.
          </p>
        ) : null}
        <EeDisclosureFields value={form} onChange={setForm} purposesError={purposesError} />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-[var(--brand-grad-from,#1a1a40)] text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving…" : data ? "Update disclosure" : "Save disclosure"}
          </button>
          {data ? (
            <button
              type="button"
              onClick={onWithdraw}
              disabled={deleteMutation.isPending}
              className="border border-red-400 text-red-700 px-4 py-2 rounded font-semibold disabled:opacity-50"
            >
              Withdraw disclosure
            </button>
          ) : null}
        </div>
      </form>
      {ConfirmDialog}
    </div>
  );
}
