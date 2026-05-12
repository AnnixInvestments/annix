interface ScoreBarProps {
  value: number;
  variant?: "opportunity" | "risk" | "confidence" | "neutral";
}

const VARIANT_COLOURS: Record<NonNullable<ScoreBarProps["variant"]>, string> = {
  opportunity: "bg-green-500",
  risk: "bg-red-500",
  confidence: "bg-blue-500",
  neutral: "bg-[#FFA500]",
};

export function ScoreBar(props: ScoreBarProps) {
  const propsVariant = props.variant;
  const variant = propsVariant ?? "neutral";
  const colour = VARIANT_COLOURS[variant];
  const clamped = Math.max(0, Math.min(100, props.value));
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm w-12 text-right">{clamped.toFixed(0)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full ${colour}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
