import type { PaperRiskProfile } from "@/app/lib/api/insightsApi";

interface RiskBadgeProps {
  profile: PaperRiskProfile;
}

const STYLES: Record<PaperRiskProfile, { label: string; classes: string }> = {
  "buy-and-hold": {
    label: "Benchmark",
    classes: "bg-gray-700 text-gray-200 border-gray-600",
  },
  conservative: {
    label: "Conservative",
    classes: "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  },
  balanced: {
    label: "Balanced",
    classes: "bg-blue-900/40 text-blue-300 border-blue-700",
  },
  "commodity-tilt": {
    label: "Commodity tilt",
    classes: "bg-orange-900/40 text-orange-300 border-orange-700",
  },
  "very-high-risk": {
    label: "Very high risk",
    classes: "bg-red-900/40 text-red-300 border-red-700",
  },
};

export function RiskBadge(props: RiskBadgeProps) {
  const meta = STYLES[props.profile];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}
