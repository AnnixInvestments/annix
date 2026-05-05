"use client";

import { useMemo, useState } from "react";
import {
  cvAssistantApiClient,
  type EeReportResponse,
  type EeSectorTargetComparison,
} from "@/app/lib/api/cvAssistantApi";
import { now } from "@/app/lib/datetime";
import { useEeReport } from "@/app/lib/query/hooks";

const TARGET_METRIC_LABELS: Record<EeSectorTargetComparison["metric"], string> = {
  race_african_black: "African / Black",
  race_coloured: "Coloured",
  race_indian: "Indian / Asian",
  female: "Female",
  disability: "Disability",
};

const OCCUPATIONAL_LEVEL_LABELS: Record<string, string> = {
  top_management: "Top management",
  senior_management: "Senior management",
  professionally_qualified: "Professionally qualified",
  skilled: "Skilled",
  semi_skilled: "Semi-skilled",
  unskilled: "Unskilled",
  unknown: "Unknown",
  all_levels: "All levels",
};

const occupationalLevelLabel = (value: string): string => {
  const mapped = OCCUPATIONAL_LEVEL_LABELS[value];
  return mapped || value;
};

export default function EeReportPage() {
  const today = useMemo(() => {
    const iso = now().toISODate();
    return iso || "";
  }, []);
  const oneYearAgo = useMemo(() => {
    const iso = now().minus({ years: 1 }).toISODate();
    return iso || today;
  }, [today]);

  const [dateFrom, setDateFrom] = useState<string>(oneYearAgo);
  const [dateTo, setDateTo] = useState<string>(today);

  const { data, isLoading, isError, refetch } = useEeReport(dateFrom, dateTo);

  const handleDownload = (kind: "csv" | "pdf") => {
    const url =
      kind === "csv"
        ? cvAssistantApiClient.complianceEeReportCsvUrl(dateFrom, dateTo)
        : cvAssistantApiClient.complianceEeReportPdfUrl(dateFrom, dateTo);
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employment Equity report</h1>
        <p className="text-gray-600 mt-1">
          Source data for EEA2 / EEA4 statutory submissions. Disclosure-only — candidates who chose
          not to disclose are not represented here.
        </p>
      </header>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-sm">
          <span className="text-gray-700 mb-1">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-gray-700 mb-1">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={() => refetch()}
          className="bg-[#1a1a40] text-white px-4 py-2 rounded font-semibold"
        >
          Run report
        </button>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => handleDownload("csv")}
            disabled={!data}
            className="border border-gray-300 px-3 py-2 rounded text-sm disabled:opacity-50"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => handleDownload("pdf")}
            disabled={!data}
            className="border border-gray-300 px-3 py-2 rounded text-sm disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-gray-600">Loading report…</p> : null}
      {isError ? (
        <p className="text-red-600">
          Couldn't load the report. Confirm your company is flagged as a designated employer.
        </p>
      ) : null}

      {data ? <ReportContent report={data} /> : null}
    </div>
  );
}

function ReportContent(props: { report: EeReportResponse }) {
  const report = props.report;
  const sectorLabel = report.economicSector;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Stat label="Company" value={report.companyName} />
          <Stat label="Sector" value={sectorLabel ? sectorLabel : "Not configured"} />
          <Stat label="Applicants" value={String(report.totalApplicantsWithDisclosure)} />
          <Stat label="New hires" value={String(report.totalNewHiresWithDisclosure)} />
        </dl>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">By occupational level</h2>
        {report.byOccupationalLevel.length === 0 ? (
          <p className="text-gray-600 text-sm">No disclosed applicants in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-700 border-b border-gray-200">
              <tr>
                <th className="py-2">Level</th>
                <th className="py-2 text-right">Applicants</th>
                <th className="py-2 text-right">New hires</th>
                <th className="py-2 text-right">Afr. Black %</th>
                <th className="py-2 text-right">Female %</th>
                <th className="py-2 text-right">Disability %</th>
              </tr>
            </thead>
            <tbody>
              {report.byOccupationalLevel.map((level) => {
                const blackPct =
                  level.applicants === 0
                    ? 0
                    : (level.byPopulation.african_black / level.applicants) * 100;
                const femalePct =
                  level.applicants === 0 ? 0 : (level.byGender.female / level.applicants) * 100;
                const disabilityPct =
                  level.applicants === 0 ? 0 : (level.byDisability.yes / level.applicants) * 100;
                return (
                  <tr key={level.occupationalLevel} className="border-b border-gray-100">
                    <td className="py-2">{occupationalLevelLabel(level.occupationalLevel)}</td>
                    <td className="py-2 text-right">{level.applicants}</td>
                    <td className="py-2 text-right">{level.newHires}</td>
                    <td className="py-2 text-right">{blackPct.toFixed(1)}%</td>
                    <td className="py-2 text-right">{femalePct.toFixed(1)}%</td>
                    <td className="py-2 text-right">{disabilityPct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Sector targets vs actuals</h2>
        {report.sectorTargetComparisons.length === 0 ? (
          <p className="text-gray-600 text-sm">
            No sector targets configured. An admin must populate cv_assistant_ee_sectoral_targets
            from the Department of Employment and Labour gazette.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-700 border-b border-gray-200">
              <tr>
                <th className="py-2">Level</th>
                <th className="py-2">Metric</th>
                <th className="py-2 text-right">Target %</th>
                <th className="py-2 text-right">Actual %</th>
                <th className="py-2 text-center">Met?</th>
                <th className="py-2">Gazette</th>
              </tr>
            </thead>
            <tbody>
              {report.sectorTargetComparisons.map((c, i) => {
                const gazette = c.gazetteReference;
                return (
                  <tr
                    key={`${c.occupationalLevel}-${c.metric}-${i}`}
                    className="border-b border-gray-100"
                  >
                    <td className="py-2">{occupationalLevelLabel(c.occupationalLevel)}</td>
                    <td className="py-2">{TARGET_METRIC_LABELS[c.metric]}</td>
                    <td className="py-2 text-right">{c.targetPercent.toFixed(2)}%</td>
                    <td className="py-2 text-right">{c.actualPercent.toFixed(2)}%</td>
                    <td className="py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${c.met ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {c.met ? "Met" : "Not met"}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{gazette ? gazette : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-4 grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">3% disability target</h3>
          <p className="text-sm text-gray-700">
            Actual:{" "}
            <span className="font-semibold">
              {report.disabilityTarget.actualPercent.toFixed(2)}%
            </span>{" "}
            across {report.disabilityTarget.sampleSize} declared candidates.
          </p>
          <p className="text-sm">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs ${report.disabilityTarget.met ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {report.disabilityTarget.met ? "Met" : "Not met"}
            </span>
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Year-over-year</h3>
          <p className="text-sm text-gray-700">
            Previous period: {report.yearOverYear.previousTotalApplicants} applicants
          </p>
          <p className="text-sm text-gray-700">
            Delta: {report.yearOverYear.delta >= 0 ? "+" : ""}
            {report.yearOverYear.delta}
            {report.yearOverYear.deltaPercent === null
              ? " (no prior data)"
              : ` (${report.yearOverYear.deltaPercent >= 0 ? "+" : ""}${report.yearOverYear.deltaPercent.toFixed(1)}%)`}
          </p>
        </div>
      </section>

      <p className="text-xs text-gray-500">Generated {report.generatedAt}</p>
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500 uppercase text-xs">{props.label}</dt>
      <dd className="text-gray-900 font-semibold mt-1">{props.value}</dd>
    </div>
  );
}
