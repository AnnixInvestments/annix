"use client";

import { MarketingBrandSwitcher } from "../MarketingBrandSwitcher";

interface AuCmsHeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export function AuCmsHeader(props: AuCmsHeaderProps) {
  const actions = props.actions;
  return (
    <div className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
      <div>
        <div className="mb-2">
          <MarketingBrandSwitcher active="au" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{props.title}</h1>
        <p className="text-xs text-gray-500">{props.subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
