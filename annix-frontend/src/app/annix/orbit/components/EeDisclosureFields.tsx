"use client";

import {
  DISABILITY_OPTIONS,
  type EeDisclosureFormState,
  GENDER_OPTIONS,
  NATIONALITY_OPTIONS,
  POPULATION_OPTIONS,
} from "../config/ee-options";

export function EeDisclosureFields(props: {
  value: EeDisclosureFormState;
  onChange: (next: EeDisclosureFormState) => void;
  purposesError?: boolean;
}) {
  const value = props.value;
  const purposesError = props.purposesError === true;

  function patch<K extends keyof EeDisclosureFormState>(key: K, next: EeDisclosureFormState[K]) {
    props.onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-6">
      <Fieldset legend="Population group">
        {POPULATION_OPTIONS.map((opt) => (
          <Radio
            key={opt.value}
            name="population_group"
            value={opt.value}
            label={opt.label}
            checked={value.populationGroup === opt.value}
            onChange={() => patch("populationGroup", opt.value)}
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
            checked={value.gender === opt.value}
            onChange={() => patch("gender", opt.value)}
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
            checked={value.disabilityStatus === opt.value}
            onChange={() => patch("disabilityStatus", opt.value)}
          />
        ))}
      </Fieldset>

      <fieldset className="space-y-2">
        <legend className="font-semibold text-gray-900">Reasonable accommodation</legend>
        <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.requiresAccommodation}
            onChange={(event) => patch("requiresAccommodation", event.target.checked)}
          />
          I'd like to discuss reasonable accommodation if shortlisted.
        </label>
        {value.requiresAccommodation ? (
          <label className="block">
            <span className="text-sm text-gray-700">Accommodation notes (optional)</span>
            <textarea
              value={value.accommodationNotes}
              onChange={(event) => patch("accommodationNotes", event.target.value)}
              placeholder="Anything that would help — e.g. step-free access, a sign-language interpreter. Kept private to HR."
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-sm"
              rows={3}
            />
          </label>
        ) : null}
      </fieldset>

      <Fieldset legend="Nationality status">
        {NATIONALITY_OPTIONS.map((opt) => (
          <Radio
            key={opt.value}
            name="nationality_status"
            value={opt.value}
            label={opt.label}
            checked={value.nationalityStatus === opt.value}
            onChange={() => patch("nationalityStatus", opt.value)}
          />
        ))}
      </Fieldset>

      <fieldset className="space-y-2" aria-invalid={purposesError} aria-describedby="purposes-hint">
        <legend className="font-semibold text-gray-900">
          Purposes of use <span className="text-red-600">*</span>
        </legend>
        <p id="purposes-hint" className="text-xs text-gray-500">
          Choose at least one. This is what your disclosure may be used for.
        </p>
        <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.eeReporting}
            onChange={(event) => patch("eeReporting", event.target.checked)}
          />
          Employment Equity Act statutory reporting (EEA2 / EEA4)
        </label>
        <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.fairnessMonitoring}
            onChange={(event) => patch("fairnessMonitoring", event.target.checked)}
          />
          AI screening fairness monitoring (POPIA s71)
        </label>
        {purposesError ? (
          <p className="text-xs text-red-600">Please select at least one purpose.</p>
        ) : null}
      </fieldset>
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
