"use client";

import { mergeMarketingDefaults } from "@/app/lib/marketing/api";
import { MarketingSitePreview } from "@/app/lib/marketing/components/MarketingSitePreview";
import { useMarketingDraft } from "@/app/lib/query/hooks";

export default function MarketingPreviewPage() {
  const draftQuery = useMarketingDraft();

  if (!draftQuery.data) {
    return <div className="p-6 text-gray-500">Loading preview…</div>;
  }

  return <MarketingSitePreview content={mergeMarketingDefaults(draftQuery.data)} />;
}
