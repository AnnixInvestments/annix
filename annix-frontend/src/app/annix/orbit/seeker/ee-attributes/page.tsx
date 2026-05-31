"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type {
  EeDisabilityKey,
  EeGenderKey,
  EePopulationGroupKey,
  MySeekerEeAttributes,
} from "@/app/lib/api/annixOrbitApi";
import { fromISO } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useDeleteMyEeAttributes,
  useMyEeAttributes,
  useUpdateMyEeAttributes,
} from "@/app/lib/query/hooks";

type NationalityKey = MySeekerEeAttributes["nationalityStatus"];
type PurposeKey = "ee_reporting" | "fairness_monitoring";

const POPULATION_OPTIONS: Array<{ value: EePopulationGroupKey; label: string }> = [
  { value: "african_black", label: "African / Black" },
  { value: "coloured", label: "Coloured" },
  { value: "indian", label: "Indian / Asian" },
  { value: "white", label: "White" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const GENDER_OPTIONS: Array<{ value: EeGenderKey; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const DISABILITY_OPTIONS: Array<{ value: EeDisabilityKey; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const NATIONALITY_OPTIONS: Array<{ value: NationalityKey; label: string }> = [
  { value: "sa_citizen", label: "South African citizen" },
  { value: "sa_permanent_resident", label: "South African permanent resident" },
  { value: "foreign_national", label: "Foreign national" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function SeekerEeAttributesPage() {
  const { data, isLoading, isError } = useMyEeAttributes();
  const updateMutation = useUpdateMyEeAttributes();
  const deleteMutation = useDeleteMyEeAttributes();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [populationGroup, setPopulationGroup] = useState<EePopulationGroupKey>("prefer_not_to_say");
  const [gender, setGender] = useState<EeGenderKey>("prefer_not_to_say");
  const [disabilityStatus, setDisabilityStatus] = useState<EeDisabilityKey>("prefer_not_to_say");
  const [requiresAccommodation, setRequiresAccommodation] = useState(false);
  const [accommodationNotes, setAccommodationNotes] = useState("");
  const [nationalityStatus, setNationalityStatus] = useState<NationalityKey>("prefer_not_to_say");
  const [eeReporting, setEeReporting] = useState(true);
  const [fairnessMonitoring, setFairnessMonitoring] = useState(true);

  useEffect(() => {
    if (!data) return;
    setPopulationGroup(data.populationGroup);
    setGender(data.gender);
    setDisabilityStatus(data.disabilityStatus);
    setRequiresAccommodation(data.requiresAccommodation);
    const notes = data.accommodationNotes;
    setAccommodationNotes(notes || "");
    setNationalityStatus(data.nationalityStatus);
    setEeReporting(data.purposes.includes("ee_reporting"));
    setFairnessMonitoring(data.purposes.includes("fairness_monitoring"));
  }, [data]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const purposes: PurposeKey[] = [];
    if (eeReporting) purposes.push("ee_reporting");
    if (fairnessMonitoring) purposes.push("fairness_monitoring");
    if (purposes.length === 0) {
      showToast(
        "Tick at least one purpose, or choose Withdraw to remove your disclosure.",
        "error",
      );
      return;
    }
    try {
      await updateMutation.mutateAsync({
        populationGroup,
        gender,
        disabilityStatus,
        requiresAccommodation,
        accommodationNotes: accommodationNotes.trim() || null,
        nationalityStatus,
        consentTextVersionId: null,
        purposes,
      });
      showToast("Your disclosure has been updated.", "success");
    } catch {
      showToast("Couldn't update your disclosure — please try again.", "error");
    }
  };

  const onWithdraw = async () => {
    const ok = await confirm({
      title: "Withdraw EE disclosure?",
      message:
        "This tombstones your demographic disclosure on every job you've applied to. You can re-disclose at any time.",
      confirmLabel: "Withdraw",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync();
      showToast("Disclosure withdrawn.", "success");
    } catch {
      showToast("Couldn't withdraw your disclosure — please try again.", "error");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-gray-600">Loading…</div>;
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
          Last updated: {fromISO(data.consentGrantedAt).toFormat("dd MMM yyyy HH:mm")} · consent
          text v{data.consentTextVersionId}
        </p>
      ) : (
        <p className="text-sm text-gray-600 mb-4">
          You haven't disclosed yet. Submitting below records your choices on every job you've
          applied to.
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-6 bg-white rounded-lg border border-gray-200 p-4"
      >
        <Fieldset legend="Population group">
          {POPULATION_OPTIONS.map((opt) => (
            <Radio
              key={opt.value}
              name="population_group"
              value={opt.value}
              label={opt.label}
              checked={populationGroup === opt.value}
              onChange={() => setPopulationGroup(opt.value)}
            />
          ))}
        </Fieldset>

        <Fieldset legend="Gender">
          {GENDER_OPTIONS.map((opt) => (
            <Radio
              key={opt.value}
              name="gender"
              value={opt.value}
              label={opt.label}
              checked={gender === opt.value}
              onChange={() => setGender(opt.value)}
            />
          ))}
        </Fieldset>

        <Fieldset legend="Disability">
          {DISABILITY_OPTIONS.map((opt) => (
            <Radio
              key={opt.value}
              name="disability_status"
              value={opt.value}
              label={opt.label}
              checked={disabilityStatus === opt.value}
              onChange={() => setDisabilityStatus(opt.value)}
            />
          ))}
        </Fieldset>

        <fieldset className="space-y-2">
          <legend className="font-semibold text-gray-900">Reasonable accommodation</legend>
          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresAccommodation}
              onChange={(event) => setRequiresAccommodation(event.target.checked)}
            />
            I'd like to discuss reasonable accommodation if shortlisted.
          </label>
          {requiresAccommodation ? (
            <textarea
              value={accommodationNotes}
              onChange={(event) => setAccommodationNotes(event.target.value)}
              placeholder="Optional notes (kept private to HR)"
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              rows={3}
            />
          ) : null}
        </fieldset>

        <Fieldset legend="Nationality status">
          {NATIONALITY_OPTIONS.map((opt) => (
            <Radio
              key={opt.value}
              name="nationality_status"
              value={opt.value}
              label={opt.label}
              checked={nationalityStatus === opt.value}
              onChange={() => setNationalityStatus(opt.value)}
            />
          ))}
        </Fieldset>

        <fieldset className="space-y-2">
          <legend className="font-semibold text-gray-900">Purposes of use</legend>
          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={eeReporting}
              onChange={(event) => setEeReporting(event.target.checked)}
            />
            Employment Equity Act statutory reporting (EEA2 / EEA4)
          </label>
          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={fairnessMonitoring}
              onChange={(event) => setFairnessMonitoring(event.target.checked)}
            />
            AI screening fairness monitoring (POPIA s71)
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-[#1a1a40] text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving…" : data ? "Update disclosure" : "Submit"}
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

function Fieldset(props: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="font-semibold text-gray-900 mb-2">{props.legend}</legend>
      <div className="space-y-1">{props.children}</div>
    </fieldset>
  );
}

function Radio(props: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
      <input
        type="radio"
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
      />
      {props.label}
    </label>
  );
}
