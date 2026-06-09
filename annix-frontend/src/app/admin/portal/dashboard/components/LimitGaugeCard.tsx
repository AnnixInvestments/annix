"use client";

import type { PlatformLimitCard } from "@/app/lib/api/adminApi";

const STATUS_RING: Record<string, string> = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  critical: "text-red-500",
  info: "text-indigo-400",
};

function formatValue(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function Donut(props: {
  percent: number | null;
  ringColorClass: string;
  centerLabel: string | null;
}) {
  const percent = props.percent;
  const ringColorClass = props.ringColorClass;
  const centerLabel = props.centerLabel;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const fraction = percent === null ? 1 : Math.min(Math.max(percent, 0), 100) / 100;
  const dash = fraction * circumference;

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="7"
          stroke="currentColor"
          className="text-gray-100 dark:text-slate-800"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke="currentColor"
          className={ringColorClass}
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      {centerLabel ? (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 tabular-nums dark:text-gray-200">
          {centerLabel}
        </span>
      ) : null}
    </div>
  );
}

export function LimitGaugeCard(props: { card: PlatformLimitCard }) {
  const card = props.card;
  const status = card.status;
  const percent = card.percent;
  const limit = card.limit;
  const value = card.value;
  const unit = card.unit;
  const label = card.label;
  const details = card.details;

  const ringColorRaw = STATUS_RING[status];
  const ringColor = ringColorRaw || STATUS_RING.info;

  const hasGauge = percent !== null && limit !== null;
  const donutPercent = hasGauge ? percent : null;
  const centerLabel = hasGauge ? `${percent}%` : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
      <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{label}</h4>

      <div className="mt-2 flex items-center gap-3">
        <Donut percent={donutPercent} ringColorClass={ringColor} centerLabel={centerLabel} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
              {formatValue(value)}
            </span>
            <span className="text-xs text-gray-500">{unit}</span>
          </div>
          {limit !== null ? (
            <div className="text-[11px] text-gray-400">
              of {formatValue(limit)} {unit}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-gray-500">{details}</p>
    </div>
  );
}
