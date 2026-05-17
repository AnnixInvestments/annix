import type { PaperRiskProfile } from "@/app/lib/api/insightsApi";

interface RiskBadgeProps {
  profile: PaperRiskProfile;
}

const STYLES: Record<PaperRiskProfile, { label: string; classes: string }> = {
  "buy-and-hold": {
    label: "Benchmark",
    classes:
      "bg-slate-200 text-slate-700 border-slate-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
  },
  conservative: {
    label: "Conservative",
    classes:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  },
  balanced: {
    label: "Balanced",
    classes:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
  },
  "commodity-tilt": {
    label: "Commodity tilt",
    classes:
      "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700",
  },
  "very-high-risk": {
    label: "Very high risk",
    classes:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
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
