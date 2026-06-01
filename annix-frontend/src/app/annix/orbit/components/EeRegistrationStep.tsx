"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_EE_FORM_STATE,
  type EeDisclosureFormState,
  eePurposesFromState,
} from "@/app/annix/orbit/config/ee-options";
import type { RegisterEeDisclosurePayload } from "@/app/lib/api/annixOrbitApi";
import { EeDisclosureFields } from "./EeDisclosureFields";

export function EeRegistrationStep(props: {
  submitting: boolean;
  error: string | null;
  onComplete: (disclosure: RegisterEeDisclosurePayload | null) => void;
}) {
  const submitting = props.submitting;
  const error = props.error;
  const [form, setForm] = useState<EeDisclosureFormState>(DEFAULT_EE_FORM_STATE);
  const [purposesError, setPurposesError] = useState(false);

  const save = () => {
    const purposes = eePurposesFromState(form);
    if (purposes.length === 0) {
      setPurposesError(true);
      return;
    }
    setPurposesError(false);
    props.onComplete({
      populationGroup: form.populationGroup,
      gender: form.gender,
      disabilityStatus: form.disabilityStatus,
      requiresAccommodation: form.requiresAccommodation,
      accommodationNotes: form.accommodationNotes.trim() || null,
      nationalityStatus: form.nationalityStatus,
      purposes,
    });
  };

  return (
    <div className="max-w-lg w-full">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Employment Equity disclosure</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Optional and voluntary. If you share this now you won't be asked again — it's saved to
            your profile and applied whenever you apply to a job. You can change or remove it any
            time from your account menu.
          </p>
          <p className="text-gray-500 mt-1 text-sm">
            Used only for Employment Equity Act reporting and AI-screening fairness monitoring;
            never seen by the candidate ranker. See the{" "}
            <Link href="/annix/orbit/ee-attributes/privacy-notice" className="underline">
              privacy notice
            </Link>
            .
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <EeDisclosureFields value={form} onChange={setForm} purposesError={purposesError} />

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="button"
            disabled={submitting}
            onClick={save}
            className="bg-[#323288] text-white py-3 px-5 rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Finishing…" : "Save & finish"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => props.onComplete(null)}
            className="border border-gray-300 text-gray-700 py-3 px-5 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
