"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { CoreBrandHeader } from "../CoreBrandHeader";
import { CORE_VERSION } from "../config/version";
import { useCoreActiveApp } from "./CoreActiveAppContext";
import { CORE_APP_META } from "./config/coreAppMeta";

export function CoreAppPicker() {
  const core = useCoreActiveApp();
  const enabledApps = core.enabledApps;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-grad-from)] px-4 py-12">
      <div className="text-center">
        <CoreBrandHeader />
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-white/65">
          {`Annix Core v${CORE_VERSION}`}
        </p>
      </div>

      {mounted ? (
        <FormModal
          isOpen={true}
          onClose={() => null}
          onSubmit={core.logout}
          title="Choose an application"
          disableClose={true}
          hideFooter={true}
          maxWidth="max-w-md"
        >
          <p className="text-sm leading-6 text-gray-600">
            You have access to more than one workspace. Pick one to continue.
          </p>
          <div className="mt-5 space-y-3">
            {enabledApps.map((app) => {
              const appMeta = CORE_APP_META[app];
              return (
                <button
                  key={app}
                  type="button"
                  onClick={() => core.switchApp(app)}
                  autoFocus={app === enabledApps[0]}
                  className="flex w-full flex-col items-start rounded-md border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-[var(--brand-accent)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:ring-offset-2"
                >
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="text-base font-semibold text-gray-900">{appMeta.label}</span>
                    <span className="shrink-0 text-xs font-medium text-gray-500">
                      {`v${appMeta.version}`}
                    </span>
                  </span>
                  <span className="mt-1 text-sm leading-5 text-gray-600">
                    {appMeta.description}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={core.logout}
            className="mt-6 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </FormModal>
      ) : null}
    </div>
  );
}
