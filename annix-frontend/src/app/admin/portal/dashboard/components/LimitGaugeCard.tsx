"use client";

import type { PlatformLimitCard } from "@/app/lib/api/adminApi";

const STATUS_BAR: Record<string, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  critical: "bg-red-500",
  info: "bg-indigo-400",
};

const STATUS_TEXT: Record<string, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  info: "text-gray-500 dark:text-gray-400",
};

function formatValue(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function LimitGaugeCard(props: { card: PlatformLimitCard }) {
  const card = props.card;
  const status = card.status;
  const percent = card.percent;
  const limit = card.limit;
  const href = card.href;

  const barColorRaw = STATUS_BAR[status];
  const barColor = barColorRaw || STATUS_BAR.info;
  const textColorRaw = STATUS_TEXT[status];
  const textColor = textColorRaw || STATUS_TEXT.info;

  const hasGauge = percent !== null && limit !== null;
  const clampedPercent = percent === null ? 0 : Math.min(percent, 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{card.label}</h4>
        {hasGauge ? <span className={`text-xs font-medium ${textColor}`}>{percent}%</span> : null}
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
          {formatValue(card.value)}
        </span>
        <span className="text-xs text-gray-500">{card.unit}</span>
        {limit !== null ? (
          <span className="text-xs text-gray-400">
            / {formatValue(limit)} {card.unit}
          </span>
        ) : null}
      </div>

      {hasGauge ? (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
          <div className={`h-full ${barColor}`} style={{ width: `${clampedPercent}%` }} />
        </div>
      ) : null}

      <p className="mt-1.5 text-[11px] leading-snug text-gray-500">{card.details}</p>

      {href ? (
        <a
          href={href}
          className="mt-1.5 inline-block text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          View →
        </a>
      ) : null}
    </div>
  );
}
