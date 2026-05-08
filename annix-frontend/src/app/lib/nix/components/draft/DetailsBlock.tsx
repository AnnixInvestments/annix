"use client";

import {
  toPairs as entries,
  isArray,
  isBoolean,
  isNumber,
  isObject,
  isString,
} from "es-toolkit/compat";
import { isPureNumber, looksLikeNumberWithUnit, parseKey, tryRangeString } from "./humanise";
import { StatCard } from "./StatCard";

/**
 * Recursively renders a structured 'details' object as a hierarchical
 * data sheet:
 *  - numeric / number-with-unit fields → stat cards in a responsive grid
 *  - string / boolean fields → labelled key/value pairs
 *  - arrays → bullet lists
 *  - nested objects → their own bordered sub-card with the same treatment
 *  - {min, max} objects → automatically collapsed to a range stat
 *
 * Generic to any Nix extraction profile — RFQ paint systems, ASCA rubber
 * lining specs, future Comply-SA standards, etc. — because it lets the
 * shape of the data drive the visual treatment.
 */
export function DetailsBlock(props: { details: Record<string, unknown> }) {
  const { details } = props;
  const rows = entries(details).filter(
    ([, v]) =>
      v !== null && v !== undefined && v !== "" && !(isArray(v) && (v as unknown[]).length === 0),
  );
  if (rows.length === 0) return null;

  const stats: { key: string; label: string; value: string; unit: string | null }[] = [];
  const texts: { key: string; label: string; display: string }[] = [];
  const arrays: { key: string; label: string; items: string[] }[] = [];
  const sections: { key: string; label: string; nested: Record<string, unknown> }[] = [];

  for (const [k, v] of rows) {
    const { label, unit } = parseKey(k);

    if (isObject(v) && !isArray(v)) {
      const nested = v as Record<string, unknown>;
      const range = tryRangeString(nested, unit ?? "");
      if (range) {
        stats.push({ key: k, label, value: range, unit: null });
        continue;
      }
      sections.push({ key: k, label, nested });
      continue;
    }

    if (isArray(v)) {
      const items = (v as unknown[])
        .filter((entry) => entry !== null && entry !== undefined && entry !== "")
        .map((entry) =>
          isString(entry) || isNumber(entry) ? String(entry) : JSON.stringify(entry),
        );
      if (items.length > 0) arrays.push({ key: k, label, items });
      continue;
    }

    if (looksLikeNumberWithUnit(v) && (unit || isPureNumber(v))) {
      const numValue = isPureNumber(v) ? String(v) : (v as string).trim();
      stats.push({ key: k, label, value: numValue, unit });
      continue;
    }

    let display: string;
    if (isString(v)) display = v;
    else if (isPureNumber(v)) display = String(v);
    else if (isBoolean(v)) display = v ? "Yes" : "No";
    else display = JSON.stringify(v);
    texts.push({ key: k, label: unit ? `${label} (${unit})` : label, display });
  }

  return (
    <div className="mt-3 space-y-3">
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {stats.map((s) => (
            <StatCard key={s.key} label={s.label} value={s.value} unit={s.unit} />
          ))}
        </div>
      )}

      {texts.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {texts.map((t) => (
            <div key={t.key} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                {t.label}
              </dt>
              <dd className="mt-0.5 text-sm text-gray-800 break-words">{t.display}</dd>
            </div>
          ))}
        </dl>
      )}

      {arrays.map((a) => (
        <div key={a.key}>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">
            {a.label}
          </div>
          <ul className="space-y-1 text-sm text-gray-700">
            {a.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {sections.map((s) => (
        <div key={s.key} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-bold text-gray-800 mb-1 pb-1 border-b border-gray-100">
            {s.label}
          </div>
          <DetailsBlock details={s.nested} />
        </div>
      ))}
    </div>
  );
}
