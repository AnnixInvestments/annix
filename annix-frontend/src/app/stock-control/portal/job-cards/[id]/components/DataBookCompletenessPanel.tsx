"use client";

import { useState } from "react";
import type {
  DataBookCompleteness,
  DataBookStatus,
  SectionStatus,
} from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface DataBookCompletenessPanelProps {
  completeness: DataBookCompleteness | null;
  dataBookStatus: DataBookStatus | null;
  isCompiling: boolean;
  onCompile: (force?: boolean) => void;
  onDownload: () => void;
}

const STATUS_COLORS: Record<SectionStatus["status"], { bg: string; text: string; dot: string }> = {
  complete: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  partial: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  missing: { bg: "bg-gray-50", text: "text-gray-400", dot: "bg-gray-300" },
};

function ProgressRing({ percent }: { percent: number }) {
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const color = percent === 100 ? "#059669" : percent >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s ease" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-900">{percent}%</span>
    </div>
  );
}

function SectionRow({ section }: { section: SectionStatus }) {
  const colors = STATUS_COLORS[section.status];
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => section.warnings.length > 0 && setExpanded(!expanded)}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 ${
          section.warnings.length > 0 ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
        <span className="flex-1 text-sm text-gray-700">{section.label}</span>
        {section.count > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {section.count}
          </span>
        )}
        {section.warnings.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {section.warnings.length} warning{section.warnings.length !== 1 ? "s" : ""}
          </span>
        )}
        {section.warnings.length > 0 && (
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {expanded && section.warnings.length > 0 && (
        <div className="border-t border-gray-100 bg-amber-50/50 px-4 py-2">
          {section.warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 py-1">
              <svg
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-amber-800">{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DataBookCompletenessPanel({
  completeness,
  dataBookStatus,
  isCompiling,
  onCompile,
  onDownload,
}: DataBookCompletenessPanelProps) {
  if (!completeness) {
    return null;
  }

  const hasBlockers = completeness.blockingReasons.length > 0;
  const warningCount = completeness.warnings.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-5 border-b border-gray-200 px-5 py-4">
        <ProgressRing percent={completeness.overallPercent} />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">Data Book Completeness</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {completeness.readyToCompile ? (
              <span className="inline-flex items-center gap-1 text-green-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Ready to compile
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                Not ready
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </span>
            )}
            {dataBookStatus?.isStale && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Stale - recompile needed
              </span>
            )}
          </div>
          {dataBookStatus?.exists && dataBookStatus.generatedAt && (
            <p className="mt-1 text-xs text-gray-500">
              Last compiled: {formatDateZA(dataBookStatus.generatedAt)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {completeness.readyToCompile ? (
            <button
              onClick={() => onCompile()}
              disabled={isCompiling}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isCompiling
                ? "Compiling..."
                : dataBookStatus?.exists
                  ? "Recompile"
                  : "Compile Data Book"}
            </button>
          ) : (
            <button
              onClick={() => onCompile(true)}
              disabled={isCompiling}
              className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              title="Force compile despite missing sections"
            >
              {isCompiling ? "Compiling..." : "Force Compile"}
            </button>
          )}
          {dataBookStatus?.exists && (
            <button
              onClick={onDownload}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>

      {hasBlockers && (
        <div className="border-b border-gray-200 bg-red-50 px-5 py-3">
          <p className="text-xs font-medium text-red-800">Missing required sections:</p>
          <ul className="mt-1 space-y-0.5">
            {completeness.blockingReasons.map((reason, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-red-700">
                <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {
          completeness.sections.reduce<{ lastGroup: string | null; elements: React.ReactNode[] }>(
            (acc, section, idx) => {
              if (section.group && section.group !== acc.lastGroup) {
                acc.elements.push(
                  <div
                    key={`group-${section.group}`}
                    className="border-t border-gray-200 bg-gray-50 px-4 py-2"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {section.group}
                    </span>
                  </div>,
                );
              }
              acc.elements.push(
                <SectionRow
                  key={`${section.group || "default"}-${section.key}-${idx}`}
                  section={section}
                />,
              );
              return { lastGroup: section.group, elements: acc.elements };
            },
            { lastGroup: null, elements: [] },
          ).elements
        }
      </div>
    </div>
  );
}
