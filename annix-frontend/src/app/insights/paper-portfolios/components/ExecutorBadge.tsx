import type { PaperExecutorStrategy } from "@/app/lib/api/insightsApi";

interface ExecutorBadgeProps {
  strategy: PaperExecutorStrategy;
}

const STYLES: Record<PaperExecutorStrategy, { label: string; classes: string } | null> = {
  "buy-and-hold": null,
  rules: null,
  "ai-pure": {
    label: "Nix · Pure",
    classes: "bg-purple-900/40 text-purple-300 border-purple-700",
  },
  "ai-override": {
    label: "Nix · Hybrid",
    classes: "bg-indigo-900/40 text-indigo-300 border-indigo-700",
  },
  "ai-picker": {
    label: "Nix · Picker",
    classes: "bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-700",
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
