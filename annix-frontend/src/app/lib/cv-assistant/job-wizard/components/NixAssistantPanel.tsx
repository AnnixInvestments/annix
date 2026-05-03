"use client";

import type { JobPosting } from "@/app/lib/api/cvAssistantApi";
import type { AutoSaveStatus } from "../hooks/useWizardAutoSave";

export interface NixAssistantPanelProps {
  draft: JobPosting | null;
  saveStatus: AutoSaveStatus;
}

/**
 * Phase 1 placeholder. Phase 2 fills in: title suggestions, description
 * draft, skill suggestions. Phase 3: live quality score with inclusivity
 * scan + recommended fixes.
 */
export function NixAssistantPanel(props: NixAssistantPanelProps) {
  const { draft, saveStatus } = props;
  const draftSkills = draft?.skills;
  const draftMetrics = draft?.successMetrics;
  const draftScreening = draft?.screeningQuestions;
  const skillCount = draftSkills ? draftSkills.length : 0;
  const successCount = draftMetrics ? draftMetrics.length : 0;
  const screeningCount = draftScreening ? draftScreening.length : 0;

  return (
    <aside className="bg-white rounded-xl shadow-md border border-[#252560]/30 p-6 flex flex-col gap-5 sticky top-20">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FFA500] to-[#FFB733] text-[#1a1a40] font-bold">
          N
        </span>
        <div>
          <h3 className="font-bold text-[#1a1a40]">Nix</h3>
          <p className="text-xs text-gray-500">Your AI hiring assistant</p>
        </div>
      </header>

      <div className="rounded-lg bg-[#f5f5fc] p-4 text-sm text-gray-700">
        I&apos;ll guide you through creating a strong job post. Phase 2 will plug me into the form —
        title suggestions, description drafting, skill ideas, salary intelligence, and a live
        quality score will all come from here.
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-[#e0e0f5] p-3">
          <div className="text-xl font-bold text-[#252560]">{skillCount}</div>
          <div className="text-xs text-[#252560]/70 uppercase tracking-wider">Skills</div>
        </div>
        <div className="rounded-lg bg-[#e0e0f5] p-3">
          <div className="text-xl font-bold text-[#252560]">{successCount}</div>
          <div className="text-xs text-[#252560]/70 uppercase tracking-wider">Outcomes</div>
        </div>
        <div className="rounded-lg bg-[#e0e0f5] p-3">
          <div className="text-xl font-bold text-[#252560]">{screeningCount}</div>
          <div className="text-xs text-[#252560]/70 uppercase tracking-wider">Filters</div>
        </div>
      </div>

      <SaveIndicator status={saveStatus} />
    </aside>
  );
}

function SaveIndicator({ status }: { status: AutoSaveStatus }) {
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "All changes saved"
        : status === "error"
          ? "Couldn't save — retrying"
          : "Auto-save ready";
  const dotClass =
    status === "saving"
      ? "bg-amber-400 animate-pulse"
      : status === "saved"
        ? "bg-emerald-500"
        : status === "error"
          ? "bg-red-500"
          : "bg-gray-300";
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-3 border-[#e0e0f5]">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      {label}
    </div>
  );
}
