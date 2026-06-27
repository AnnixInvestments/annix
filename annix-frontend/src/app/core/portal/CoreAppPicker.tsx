"use client";

import { useCoreActiveApp } from "./CoreActiveAppContext";
import type { CoreApp } from "./config/navAppMap";

const APP_LABELS: Record<CoreApp, string> = {
  "stock-control": "Stock Control",
  "au-rubber": "AU Rubber",
};

const APP_DESCRIPTIONS: Record<CoreApp, string> = {
  "stock-control": "Inventory, job cards, purchasing, quality and dispatch.",
  "au-rubber": "Rubber-lining production, compounds, CoCs and orders.",
};

export function CoreAppPicker() {
  const core = useCoreActiveApp();
  const enabledApps = core.enabledApps;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-white">Choose an application</h1>
        <p className="mt-2 text-sm text-blue-200">
          You have access to more than one workspace. Pick one to continue.
        </p>

        <div className="mt-8 space-y-3">
          {enabledApps.map((app) => {
            const label = APP_LABELS[app];
            const description = APP_DESCRIPTIONS[app];
            return (
              <button
                key={app}
                type="button"
                onClick={() => core.switchApp(app)}
                className="flex w-full flex-col items-start rounded-lg bg-white px-5 py-4 text-left shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <span className="text-base font-semibold text-gray-900">{label}</span>
                <span className="mt-1 text-sm text-gray-600">{description}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={core.logout}
          className="mt-8 text-sm text-blue-200 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
