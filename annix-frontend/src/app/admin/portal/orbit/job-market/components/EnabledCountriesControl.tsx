"use client";

import { useToast } from "@/app/components/Toast";
import { useAlert } from "@/app/lib/hooks/useAlert";
import {
  useAdminOrbitEnabledCountries,
  useAdminSetOrbitEnabledCountries,
} from "@/app/lib/query/hooks";

const COUNTRY_LABELS: Record<string, string> = {
  za: "South Africa",
  gb: "United Kingdom",
};

function countryLabel(code: string): string {
  const label = COUNTRY_LABELS[code];
  return label ? label : code.toUpperCase();
}

export function EnabledCountriesControl() {
  const query = useAdminOrbitEnabledCountries();
  const setCountries = useAdminSetOrbitEnabledCountries();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();

  const data = query.data;
  const all = data ? data.all : [];
  const enabled = data ? data.enabled : [];

  const toggle = (code: string) => {
    const isOn = enabled.includes(code);
    const next = isOn ? enabled.filter((c) => c !== code) : [...enabled, code];
    setCountries.mutate(next, {
      onSuccess: () =>
        showToast(`${countryLabel(code)} ${isOn ? "hidden from" : "shown to"} seekers.`, "success"),
      onError: () =>
        alert({ message: "Couldn't update countries — please try again.", variant: "error" }),
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      {AlertDialog}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        Seeker job countries (live)
      </h3>
      <p className="text-xs text-gray-500">
        Tick the countries seekers can pick on “Where do you want to work?”. Untick one (e.g. United
        Kingdom) to hide it from the picker and drop it from matching immediately.
      </p>
      <div className="mt-3 flex flex-wrap gap-5">
        {all.map((code) => {
          const checked = enabled.includes(code);
          return (
            <label key={code} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={checked}
                disabled={setCountries.isPending}
                onChange={() => toggle(code)}
                className="h-4 w-4"
              />
              <span className="text-gray-700 dark:text-gray-200">{countryLabel(code)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
