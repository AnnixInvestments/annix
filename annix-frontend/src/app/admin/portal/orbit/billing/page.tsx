"use client";

import type { OrbitBillingModule, OrbitBillingModuleSetting } from "@/app/lib/api/adminApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import {
  useAdminOrbitBillingSettings,
  useAdminSetOrbitBillingModuleEnabled,
} from "@/app/lib/query/hooks";

const MODULE_LABELS: Record<OrbitBillingModule, string> = {
  seeker: "Seekers",
  company: "Companies",
  recruiter: "Recruiters",
  student: "Students",
};

function BillingToggleRow(props: {
  setting: OrbitBillingModuleSetting;
  saving: boolean;
  onToggle: (module: OrbitBillingModule, enabled: boolean) => void;
}) {
  const setting = props.setting;
  const label = MODULE_LABELS[setting.module];
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0 dark:border-white/10">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {setting.persisted
            ? "Admin controlled"
            : `Using env default: ${setting.envDefault ? "on" : "off"}`}
        </p>
      </div>
      <label className="inline-flex items-center gap-3">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {setting.enabled ? "On" : "Off"}
        </span>
        <input
          type="checkbox"
          checked={setting.enabled}
          disabled={props.saving}
          onChange={(event) => props.onToggle(setting.module, event.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          aria-label={`${label} billing`}
        />
      </label>
    </div>
  );
}

export default function AdminOrbitBillingPage() {
  const settingsQuery = useAdminOrbitBillingSettings();
  const setModule = useAdminSetOrbitBillingModuleEnabled();
  const { alert, AlertDialog } = useAlert();
  const settings = settingsQuery.data;
  const modules = settings ? settings.modules : [];

  const handleToggle = (module: OrbitBillingModule, enabled: boolean) => {
    setModule.mutate(
      { module, enabled },
      {
        onError: () => alert({ message: "Couldn't update the billing toggle.", variant: "error" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      {AlertDialog}
      <div>
        <h1 className="text-2xl font-semibold text-white">Orbit Billing</h1>
        <p className="mt-1 text-sm text-white/70">Runtime payment gates for each Orbit module.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        {settingsQuery.isLoading ? (
          <div className="px-4 py-8 text-sm text-gray-500">Loading billing settings…</div>
        ) : (
          modules.map((setting) => (
            <BillingToggleRow
              key={setting.module}
              setting={setting}
              saving={setModule.isPending}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
