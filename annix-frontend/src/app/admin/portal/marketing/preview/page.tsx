"use client";

import { MarketingSitePreview } from "@/app/lib/marketing/components/MarketingSitePreview";
import { useMarketingDraft } from "@/app/lib/query/hooks";

export default function MarketingPreviewPage() {
  const draftQuery = useMarketingDraft();
  const content = draftQuery.data;

  if (!content) {
    return <div className="p-6 text-gray-500">Loading preview…</div>;
  }

  return <MarketingSitePreview content={content} />;
}
