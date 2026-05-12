"use client";

import { isArray, isNumber, isString } from "es-toolkit/compat";
import { useState } from "react";

/**
 * Renders the structured spec-PDF metadata Nix lifts out of tender
 * specifications — working pressure, working temperature, valve
 * types, governing standards, flange standard + SANS 1123 table,
 * NDT methods, hydrotest multiplier + hold time, NACE compliance,
 * sour-service flag, gasket type, material grade.
 *
 * Shared across every app that consumes Nix specifications. The
 * data lives on `extraction.extractedData.metadata` (populated by
 * PdfExtractorService.extractMetadata) and the same shape is
 * surfaced uniformly on the RFQ Specifications step (via
 * AutoExtractedSpecsBanner) and inside Stock Control's quote-draft
 * page (via NixDraftReview → ExtractionCard).
 *
 * Pure presentation — no state outside the "Show source clause"
 * toggle. Renders null when no fields are populated so quotes that
 * dropped only drawings (no specs) don't see an empty panel.
 *
 * Issue #288 Phase 8 — per-portal generalisation.
 */
export function SpecMetadataPanel(props: { metadata: Record<string, unknown> | null | undefined }) {
  const { metadata } = props;
  const [showExcerpt, setShowExcerpt] = useState(false);

  if (!metadata) return null;

  const workingPressureBar = readNumber(metadata, "workingPressureBar");
  const workingTemperatureC = readNumber(metadata, "workingTemperatureC");
  const materialGrade = readString(metadata, "materialGrade");
  const coating = readString(metadata, "coating");
  const lining = readString(metadata, "lining");
  const valveTypes = readStringArray(metadata, "valveTypes");
  const valveStandards = readStringArray(metadata, "valveStandards");
  const flangeStandard = readString(metadata, "flangeStandard");
  const flangeTableDesignation = readString(metadata, "flangeTableDesignation");
  const ndtMethods = readStringArray(metadata, "ndtMethods");
  const hydrotestMultiplier = readNumber(metadata, "hydrotestMultiplier");
  const hydrotestHoldMinutes = readNumber(metadata, "hydrotestHoldMinutes");
  const naceCompliance = readString(metadata, "naceCompliance");
  const sourService = metadata.sourService === true;
  const gasketType = readString(metadata, "gasketType");
  const valveClauseExcerpt = readString(metadata, "valveClauseExcerpt");

  const hasAnything =
    workingPressureBar != null ||
    workingTemperatureC != null ||
    !!materialGrade ||
    !!coating ||
    !!lining ||
    (valveTypes && valveTypes.length > 0) ||
    (valveStandards && valveStandards.length > 0) ||
    !!flangeStandard ||
    !!flangeTableDesignation ||
    (ndtMethods && ndtMethods.length > 0) ||
    hydrotestMultiplier != null ||
    hydrotestHoldMinutes != null ||
    !!naceCompliance ||
    sourService ||
    !!gasketType ||
    !!valveClauseExcerpt;

  if (!hasAnything) return null;

  return (
    <div className="px-3 py-3 bg-blue-50/40 border-t border-blue-100">
      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
        Auto-extracted spec metadata
      </h4>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-blue-900">
        {materialGrade && (
          <Row label="Material spec">
            <span>{materialGrade}</span>
          </Row>
        )}
        {workingPressureBar != null && (
          <Row label="Working pressure">
            <span>{workingPressureBar} bar</span>
          </Row>
        )}
        {workingTemperatureC != null && (
          <Row label="Working temp">
            <span>{workingTemperatureC} °C</span>
          </Row>
        )}
        {valveTypes && valveTypes.length > 0 && (
          <Row label="Valve types">
            <ChipList items={valveTypes} />
          </Row>
        )}
        {valveStandards && valveStandards.length > 0 && (
          <Row label="Valve standards">
            <ChipList items={valveStandards} />
          </Row>
        )}
        {(flangeStandard || flangeTableDesignation) && (
          <Row label="Flange standard">
            <span>
              {flangeStandard ?? "—"}
              {flangeTableDesignation ? ` · ${flangeTableDesignation}` : ""}
            </span>
          </Row>
        )}
        {ndtMethods && ndtMethods.length > 0 && (
          <Row label="NDT methods">
            <ChipList items={ndtMethods} />
          </Row>
        )}
        {(hydrotestMultiplier != null || hydrotestHoldMinutes != null) && (
          <Row label="Hydrotest">
            <span>
              {hydrotestMultiplier != null ? `${hydrotestMultiplier}× design` : null}
              {hydrotestMultiplier != null && hydrotestHoldMinutes != null ? ", " : null}
              {hydrotestHoldMinutes != null ? `${hydrotestHoldMinutes} min hold` : null}
            </span>
          </Row>
        )}
        {naceCompliance && (
          <Row label="NACE / sour">
            <span>{naceCompliance}</span>
          </Row>
        )}
        {!naceCompliance && sourService && (
          <Row label="NACE / sour">
            <span>Sour service / H₂S flagged</span>
          </Row>
        )}
        {gasketType && (
          <Row label="Gasket">
            <span>{gasketType}</span>
          </Row>
        )}
        {coating && (
          <Row label="External coating">
            <span>{coating}</span>
          </Row>
        )}
        {lining && (
          <Row label="Internal lining">
            <span>{lining}</span>
          </Row>
        )}
      </dl>
      {valveClauseExcerpt && (
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
  );
}

function Row(props: { label: string; children: React.ReactNode }) {
  const { label, children } = props;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
      <dt className="font-medium text-blue-900 sm:min-w-[120px]">{label}:</dt>
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

function readString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key];
  if (isString(value) && value.trim().length > 0) return value;
  return null;
}

function readNumber(obj: Record<string, unknown>, key: string): number | null {
  const value = obj[key];
  if (isNumber(value) && Number.isFinite(value)) return value;
  return null;
}

function readStringArray(obj: Record<string, unknown>, key: string): string[] | null {
  const value = obj[key];
  if (!isArray(value)) return null;
  const strings = value.filter((v): v is string => isString(v) && v.trim().length > 0);
  return strings.length > 0 ? strings : null;
}
