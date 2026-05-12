"use client";

import { useState } from "react";
import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

interface AutoExtractedSpecsBannerProps {
  globalSpecs: GlobalSpecs | undefined;
}

export function AutoExtractedSpecsBanner(props: AutoExtractedSpecsBannerProps) {
  const { globalSpecs } = props;
  const [showExcerpt, setShowExcerpt] = useState(false);

  if (!globalSpecs) return null;

  const valveTypes = globalSpecs.valveTypes;
  const valveStandards = globalSpecs.valveStandards;
  const flangeStandardName = globalSpecs.flangeStandardName;
  const flangeTableDesignation = globalSpecs.flangeTableDesignation;
  const ndtMethods = globalSpecs.ndtMethods;
  const hydrotestMultiplier = globalSpecs.hydrotestMultiplier;
  const valveClauseExcerpt = globalSpecs.valveClauseExcerpt;
  const specPdfMaterialGrade = globalSpecs.specPdfMaterialGrade;

  const hasValveTypes = !!(valveTypes && valveTypes.length > 0);
  const hasValveStandards = !!(valveStandards && valveStandards.length > 0);
  const hasFlange = !!(flangeStandardName || flangeTableDesignation);
  const hasNdt = !!(ndtMethods && ndtMethods.length > 0);
  const hasHydrotest = hydrotestMultiplier != null;
  const hasExcerpt = !!valveClauseExcerpt;
  const hasMaterialGrade = !!specPdfMaterialGrade;
  const hasAnything =
    hasValveTypes ||
    hasValveStandards ||
    hasFlange ||
    hasNdt ||
    hasHydrotest ||
    hasExcerpt ||
    hasMaterialGrade;

  if (!hasAnything) return null;

  return (
    <div className="mb-2 bg-blue-50 border-l-4 border-blue-500 rounded p-2 text-xs">
      <div className="flex items-start gap-2">
        <svg
          className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">Pre-filled from tender-spec PDFs</h3>
          <p className="text-blue-800 mb-2">
            Nix lifted the following scope out of the spec PDFs you dropped. Confirm or override
            anything that doesn't apply before continuing.
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-blue-900">
            {hasMaterialGrade && (
              <SpecRow label="Material spec">
                <span>{specPdfMaterialGrade}</span>
              </SpecRow>
            )}
            {hasValveTypes && (
              <SpecRow label="Valve types">
                <ChipList items={valveTypes || []} />
              </SpecRow>
            )}
            {hasValveStandards && (
              <SpecRow label="Valve standards">
                <ChipList items={valveStandards || []} />
              </SpecRow>
            )}
            {hasFlange && (
              <SpecRow label="Flange standard">
                <span>
                  {flangeStandardName ?? "—"}
                  {flangeTableDesignation ? ` · ${flangeTableDesignation}` : ""}
                </span>
              </SpecRow>
            )}
            {hasNdt && (
              <SpecRow label="NDT methods">
                <ChipList items={ndtMethods || []} />
              </SpecRow>
            )}
            {hasHydrotest && (
              <SpecRow label="Hydrotest">
                <span>{hydrotestMultiplier}× design pressure</span>
              </SpecRow>
            )}
          </dl>
          {hasExcerpt && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowExcerpt((prev) => !prev)}
                className="text-blue-700 hover:text-blue-900 underline text-[11px]"
              >
                {showExcerpt ? "Hide" : "Show"} source clause
              </button>
              {showExcerpt && (
                <blockquote className="mt-1 p-2 bg-white border border-blue-200 rounded text-blue-900 italic text-[11px] leading-snug">
                  "{valveClauseExcerpt}"
                </blockquote>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecRow(props: { label: string; children: React.ReactNode }) {
  const { label, children } = props;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
      <dt className="font-medium text-blue-900 sm:min-w-[110px]">{label}:</dt>
      <dd className="flex flex-wrap gap-1">{children}</dd>
    </div>
  );
}

function ChipList(props: { items: string[] }) {
  const { items } = props;
  return (
    <>
      {items.map((item) => (
        <span
          key={item}
          className="inline-block px-1.5 py-0.5 bg-blue-100 border border-blue-300 rounded text-blue-900 text-[10px]"
        >
          {item}
        </span>
      ))}
    </>
  );
}
