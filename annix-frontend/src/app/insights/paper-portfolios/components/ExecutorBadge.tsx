import type { PaperExecutorStrategy } from "@/app/lib/api/insightsApi";

interface ExecutorBadgeProps {
  strategy: PaperExecutorStrategy;
}

const STYLES: Record<PaperExecutorStrategy, { label: string; classes: string } | null> = {
  "buy-and-hold": null,
  rules: null,
  "ai-pure": {
    label: "Nix · Pure",
    classes:
      "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700",
  },
  "ai-override": {
    label: "Nix · Hybrid",
    classes:
      "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700",
  },
  "ai-picker": {
    label: "Nix · Picker",
    classes:
      "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 dark:border-fuchsia-700",
  },
};

export function ExecutorBadge(props: ExecutorBadgeProps) {
  const meta = STYLES[props.strategy];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}
