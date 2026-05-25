"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdmissionDraft } from "@/app/lib/api/educationIngestionAdminApi";
import {
  useApproveDraft,
  useCorrectDraft,
  useEducationDrafts,
  useIngestAdmission,
  useRejectDraft,
} from "@/app/lib/query/hooks";

function statusClass(status: string): string {
  if (status === "approved") {
    return "bg-green-100 text-green-700";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }
  return "bg-yellow-100 text-yellow-700";
}

function IngestForm() {
  const ingest = useIngestAdmission();
  const [sourceUrl, setSourceUrl] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [intakeYear, setIntakeYear] = useState("2026");

  const pending = ingest.isPending;
  const isError = ingest.isError;
  const result = ingest.data;

  const submit = () => {
    const year = Number(intakeYear);
    if (sourceUrl.trim().length === 0 || Number.isNaN(year)) {
      return;
    }
    const payload: { intakeYear: number; sourceUrl: string; programmeId?: string } = {
      intakeYear: year,
      sourceUrl: sourceUrl.trim(),
    };
    if (programmeId.trim().length > 0) {
      payload.programmeId = programmeId.trim();
    }
    ingest.mutate(payload);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold text-gray-900">Scrape an admissions page</h2>
      <p className="text-sm text-gray-500">
        Fetches the page, captures a screenshot, and extracts requirements as drafts for review.
        Nothing goes live until you approve it.
      </p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <label className="flex flex-col md:col-span-2">
          <span className="text-gray-500">Source URL</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.uct.ac.za/apply/admission-requirements"
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Intake year</span>
          <input
            type="number"
            value={intakeYear}
            onChange={(e) => setIntakeYear(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col md:col-span-3">
          <span className="text-gray-500">Programme ID (optional UUID)</span>
          <input
            value={programmeId}
            onChange={(e) => setProgrammeId(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending || sourceUrl.trim().length === 0}
        className="mt-3 px-3 py-1.5 rounded bg-yellow-500 text-white text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Scraping…" : "Scrape page"}
      </button>
      {result ? (
        <p className="mt-2 text-sm text-green-700">
          Captured {result.drafts} draft requirement(s) — review them below.
        </p>
      ) : null}
      {isError ? (
        <p className="mt-2 text-sm text-red-600">
          Could not scrape that page — check the URL is reachable and try again.
        </p>
      ) : null}
    </div>
  );
}

function DraftRow(props: { draft: AdmissionDraft }) {
  const draft = props.draft;
  const approve = useApproveDraft();
  const correct = useCorrectDraft();
  const reject = useRejectDraft();

  const currentValue = draft.approvedValue;
  const baseValue = currentValue ?? draft.extractedValue;
  const [valueText, setValueText] = useState(() => JSON.stringify(baseValue, null, 2));
  const [parseError, setParseError] = useState(false);

  const screenshotUrl = draft.screenshotUrl;
  const confidence = draft.confidence;
  const confidenceLabel = confidence ?? "—";
  const title = draft.label.length > 0 ? draft.label : draft.fieldKey;
  const approvePending = approve.isPending;
  const correctPending = correct.isPending;
  const rejectPending = reject.isPending;
  const busy = approvePending || correctPending || rejectPending;

  const saveCorrected = () => {
    try {
      const parsed = JSON.parse(valueText);
      setParseError(false);
      correct.mutate({ id: draft.id, value: parsed });
    } catch {
      setParseError(true);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 font-mono">{draft.fieldKey}</p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusClass(draft.status)}`}
        >
          {draft.status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <a
          href={draft.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Open source page ↗
        </a>
        {screenshotUrl ? (
          <a
            href={screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View captured screenshot ↗
          </a>
        ) : (
          <span className="text-gray-400">No screenshot</span>
        )}
        <span className="text-gray-500">Confidence: {confidenceLabel}</span>
      </div>

      {draft.rawSnippet ? (
        <p className="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
          “{draft.rawSnippet}”
        </p>
      ) : null}

      <label className="flex flex-col mt-3 text-sm">
        <span className="text-gray-500">Marks / requirement (edit if scraped incorrectly)</span>
        <textarea
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          rows={3}
          className="border rounded px-2 py-1 font-mono text-xs"
        />
      </label>
      {parseError ? <p className="text-xs text-red-600 mt-1">Invalid JSON — please fix.</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => approve.mutate(draft.id)}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-semibold disabled:opacity-50"
        >
          Approve as-is
        </button>
        <button
          type="button"
          onClick={saveCorrected}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-gray-800 text-white text-xs font-semibold disabled:opacity-50"
        >
          Save edit & approve
        </button>
        <button
          type="button"
          onClick={() => reject.mutate(draft.id)}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-xs font-semibold disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export default function AdminEducationIngestionPage() {
  const draftsQuery = useEducationDrafts({});
  const draftsData = draftsQuery.data;
  const drafts = draftsData ?? [];
  const isLoading = draftsQuery.isLoading;

  const pending = drafts.filter((draft) => draft.status === "draft" || draft.status === "changed");
  const approved = drafts.filter((draft) => draft.status === "approved");

  return (
    <div className="px-4 py-8 max-w-5xl mx-auto">
      <Link
        href="/admin/portal/orbit"
        className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
      >
        ← Orbit admin hub
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Admission data — ingest & verify</h1>
      <p className="mt-1 text-sm text-gray-500">
        Scraped marks stay as drafts until you approve them. Approve some and not others — only
        approved marks go live; the rest show “Marks still to be confirmed”.
      </p>

      <div className="mt-6">
        <IngestForm />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">
          Pending review ({pending.length}) · Approved ({approved.length})
        </h2>
        {isLoading ? <p className="mt-2 text-gray-500">Loading…</p> : null}
        <div className="mt-3 grid grid-cols-1 gap-3">
          {drafts.map((draft) => (
            <DraftRow key={draft.id} draft={draft} />
          ))}
        </div>
        {!isLoading && drafts.length === 0 ? (
          <p className="mt-2 text-gray-500">No drafts yet — scrape a page above.</p>
        ) : null}
      </div>
    </div>
  );
}
