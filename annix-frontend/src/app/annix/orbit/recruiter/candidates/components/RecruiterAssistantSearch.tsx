"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitRecruiterSearchResult } from "@/app/lib/api/annixOrbitApi";
import { useOrbitRecruiterFindCandidates } from "@/app/lib/query/hooks";
import { siteReadyMeta } from "./siteReadyMeta";
import { useOrbitAssistantProgress } from "./useOrbitAssistantProgress";

const EXAMPLE = "Find me 10 site-ready boilermakers in Gauteng with mining experience";

export function RecruiterAssistantSearch() {
  const { showToast } = useToast();
  const { run } = useOrbitAssistantProgress();
  const findMutation = useOrbitRecruiterFindCandidates();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<OrbitRecruiterSearchResult | null>(null);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      showToast("Type what you're looking for, e.g. site-ready welders in Gauteng.", "error");
      return;
    }
    try {
      const found = await run("find-candidates", "Orbit AI is searching your talent pool…", () =>
        findMutation.mutateAsync(trimmed),
      );
      setResult(found);
    } catch {
      showToast("The AI search failed. Please try again.", "error");
    }
  };

  return (
    <div className="rounded-2xl border border-[#c0c0eb] bg-gradient-to-br from-[#f4f4fd] to-white dark:from-white/5 dark:to-transparent p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-[#252560] dark:text-white">Ask Orbit AI</span>
        <span className="text-xs text-gray-500 dark:text-[#c0c0eb]">
          Search your talent pool in plain language
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSearch();
          }}
          placeholder={EXAMPLE}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={findMutation.isPending}
          className="px-4 py-2 bg-[#323288] text-white text-sm font-medium rounded-lg hover:bg-[#252560] disabled:opacity-50 whitespace-nowrap"
        >
          {findMutation.isPending ? "Searching…" : "Ask Orbit AI"}
        </button>
      </div>

      {result ? (
        <div className="mt-3">
          <p className="text-sm text-gray-700 dark:text-[#c0c0eb]">{result.summary}</p>
          {result.candidates.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {result.candidates.map((candidate) => {
                const meta = siteReadyMeta(candidate.siteReadyStatus);
                return (
                  <li
                    key={candidate.candidateId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[#252560] dark:text-white truncate">
                        {candidate.fullName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-[#c0c0eb]">
                        {candidate.currentRole ? candidate.currentRole : "—"}
                        {candidate.location ? ` · ${candidate.location}` : ""}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${meta.chipClasses}`}
                    >
                      {meta.label}
                      {candidate.siteReadyScore > 0 ? (
                        <span>· {candidate.siteReadyScore}%</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
