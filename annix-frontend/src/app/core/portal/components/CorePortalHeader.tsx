"use client";

import { OpsHeader } from "@/app/ops/components/OpsHeader";
import { CORE_VERSION } from "../../config/version";
import { useCoreActiveApp } from "../CoreActiveAppContext";
import { CORE_APP_META } from "../config/coreAppMeta";
import type { CoreApp } from "../config/navAppMap";

/**
 * Thin wrapper over the read-only `OpsHeader`. Adds a "Switch app" affordance
 * when the user is entitled to more than one workspace, and delegates the
 * sign-out to the core (cross-store) logout.
 */
export function CorePortalHeader(props: {
  activeApp: CoreApp;
  userName: string | null;
  companyName: string | null;
  onMenuToggle: () => void;
}) {
  const core = useCoreActiveApp();
  const enabledApps = core.enabledApps;
  const canSwitch = enabledApps.length > 1;

  const appMeta = CORE_APP_META[props.activeApp];
  const appLabel = appMeta.label;
  const companyName = props.companyName;
  const headerCompanyName = companyName ?? appLabel;

  return (
    <div className="border-b border-t-2 border-gray-200 border-t-[var(--brand-accent)] bg-white print:hidden">
      <OpsHeader
        userName={props.userName}
        companyName={headerCompanyName}
        onMenuToggle={props.onMenuToggle}
        onLogout={core.logout}
      />
      <div className="border-t border-gray-100 px-4 py-1 text-xs text-gray-500">
        {`Annix Core v${CORE_VERSION} • ${appLabel} v${appMeta.version}`}
      </div>
      {canSwitch && (
        <div className="flex items-center gap-2 px-4 pb-2">
          {enabledApps.map((app) => {
            const isActive = app === props.activeApp;
            const label = CORE_APP_META[app].label;
            return (
              <button
                key={app}
                type="button"
                onClick={() => core.switchApp(app)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gray-100 font-semibold text-gray-900"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
