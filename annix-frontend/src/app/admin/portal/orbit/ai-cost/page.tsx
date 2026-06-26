"use client";

import { AiCostByFeatureView } from "@/app/components/admin/AiCostByFeatureView";

export default function OrbitAiCostPage() {
  return (
    <AiCostByFeatureView
      app="annix-orbit"
      title="Orbit AI Cost by Feature"
      subtitle="Gemini spend grouped by feature (action type) + model, over the selected window. Use this to see exactly where the daily cost goes (ref #390)."
    />
  );
}
