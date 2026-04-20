"use client";

import { useOpsModules } from "../../context/OpsModuleContext";

export default function OpsDashboard() {
  const { activeModules, isLoaded } = useOpsModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Annix Ops — unified operations platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoaded && activeModules.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Active Modules</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{activeModules.length}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {activeModules.map((mod) => (
                <span
                  key={mod}
                  className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700"
                >
                  {mod}
                </span>
              ))}
            </div>
          </div>
        )}

        {isLoaded && activeModules.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm sm:col-span-2 lg:col-span-3">
            <h3 className="text-sm font-medium text-amber-800">No modules configured</h3>
            <p className="mt-1 text-sm text-amber-700">
              Contact your administrator to enable modules for your company.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
