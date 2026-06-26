"use client";

import { useParams } from "next/navigation";
import { AiCostByFeatureView } from "@/app/components/admin/AiCostByFeatureView";

const APP_LABELS: Record<string, string> = {
  "annix-orbit": "Annix Orbit",
  "au-rubber": "AU Rubber",
  nix: "Nix",
  "stock-control": "Stock Control",
  "annix-sentinel": "Annix Sentinel",
  unknown: "Unknown / uncontextualised",
};

export default function AiCostByAppPage() {
  const params = useParams<{ app: string }>();
  const rawApp = params?.app;
  const app = rawApp ?? "unknown";
  const label = APP_LABELS[app];
  const display = label ?? app;

  return (
    <AiCostByFeatureView
      app={app}
      title={`${display} — AI Cost by Feature`}
      subtitle="Gemini spend grouped by feature (action type) + model, over the selected window."
    />
  );
}
