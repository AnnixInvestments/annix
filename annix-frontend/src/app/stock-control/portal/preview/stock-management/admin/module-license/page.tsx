"use client";

import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { ModuleLicensePage } from "@/app/modules/stock-management/pages/ModuleLicensePage";

export default function PreviewModuleLicensePage() {
  const { profile } = useStockControlAuth();
  const companyId = profile?.companyId;

  if (!companyId) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700">
        Waiting for company profile to load…
      </div>
    );
  }

  return <ModuleLicensePage companyId={companyId} />;
}
