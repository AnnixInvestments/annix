"use client";

import { useState } from "react";
import { fromISO } from "@/app/lib/datetime";
import { useMineLibraryExtractions, useMineLibraryMines } from "@/app/lib/query/hooks";

export interface MineLibraryDetailProps {
  mineId: number;
  backHref: string;
  /**
   * Optional builder for the per-document revisions archive URL. Hosts that
   * mount this component in a portal with a documents/[docNumber] route
   * supply this to make the Doc # cell clickable; without it the cell
   * stays read-only.
   */
  documentRevisionsHref?: (documentNumber: string, mineId: number) => string;
}

export function MineLibraryDetail(props: MineLibraryDetailProps) {
  const { mineId, backHref, documentRevisionsHref } = props;
  const minesQuery = useMineLibraryMines();
  const extractionsQuery = useMineLibraryExtractions(mineId);
  const [filter, setFilter] = useState("");

  const minesData = minesQuery.data;
  const minesList = minesData ? minesData : [];
  const mine = minesList.find((m) => m.id === mineId);
  const filterTrimmed = filter.trim().toLowerCase();
  const extractionsData = extractionsQuery.data;
  const extractionsList = extractionsData ? extractionsData : [];
  const filteredExtractions = extractionsList.filter((e) => {
    if (filterTrimmed.length === 0) return true;
    const docNumber = e.documentNumber;
    const docTitle = e.documentTitle;
    const filename = e.sourceFilename;
    const haystack = [docNumber || "", docTitle || "", filename || ""].join(" ").toLowerCase();
    return haystack.includes(filterTrimmed);
  });

  const mineLabel = mine ? mine.mineName : `Mine #${mineId}`;
  const operatingCompany = mine ? mine.operatingCompany : "";
  const extractionsErrorObj = extractionsQuery.error;
  const extractionsErrorMessage = extractionsErrorObj ? extractionsErrorObj.message : "";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <a href={backHref} className="text-xs text-blue-600 hover:text-blue-800 underline">
        ← Back to all mines
      </a>
      <header className="mt-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{mineLabel}</h1>
        {operatingCompany ? <p className="text-sm text-gray-600">{operatingCompany}</p> : null}
      </header>

      <input
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter by doc number, title, or filename…"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
      />

      {extractionsQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : extractionsQuery.isError ? (
        <p className="text-sm text-red-600">Couldn't load extractions. {extractionsErrorMessage}</p>
      ) : filteredExtractions.length === 0 ? (
        <p className="text-sm text-gray-500">
          {filterTrimmed.length > 0
            ? "No extractions match the filter."
            : "No extractions tagged to this mine yet."}
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium text-gray-700">Doc #</th>
                <th className="px-3 py-2 font-medium text-gray-700">Rev</th>
                <th className="px-3 py-2 font-medium text-gray-700">Title / Filename</th>
                <th className="px-3 py-2 font-medium text-gray-700">Confidence</th>
                <th className="px-3 py-2 font-medium text-gray-700">Status</th>
                <th className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExtractions.map((e) => {
                const docNumberValue = e.documentNumber;
                const docNumber = docNumberValue ? docNumberValue : "—";
                const revValue = e.documentRevision;
                const rev = revValue ? revValue : "—";
                const titleValue = e.documentTitle;
                const filenameValue = e.sourceFilename;
                const titleOrFilename = titleValue
                  ? titleValue
                  : filenameValue
                    ? filenameValue
                    : "—";
                const confValue = e.mineInferenceConfidence;
                const confidence =
                  confValue === null || confValue === undefined
                    ? "—"
                    : `${Math.round(confValue * 100)}%`;
                const captured = fromISO(e.createdAt).toFormat("dd MMM yyyy");
                const docNumberCell =
                  docNumberValue && documentRevisionsHref ? (
                    <a
                      href={documentRevisionsHref(docNumberValue, mineId)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {docNumberValue}
                    </a>
                  ) : (
                    docNumber
                  );
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{docNumberCell}</td>
                    <td className="px-3 py-2 font-mono text-xs">{rev}</td>
                    <td className="px-3 py-2">{titleOrFilename}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{confidence}</td>
                    <td className="px-3 py-2 text-xs">{e.status}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {captured}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
