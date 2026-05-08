"use client";

export function StatCard(props: { label: string; value: string; unit: string | null }) {
  const { label, value, unit } = props;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-bold text-gray-900 tabular-nums">{value}</span>
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}
