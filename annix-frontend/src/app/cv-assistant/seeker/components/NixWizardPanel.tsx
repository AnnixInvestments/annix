"use client";

import { useState } from "react";
import type {
  NixSeekerCvAssessment,
  NixSeekerCvImprovement,
  NixSeekerImprovementArea,
  NixSeekerPriority,
  NixSeekerRankingPotential,
} from "@/app/lib/api/cvAssistantApi";
import { useCvNixWizardImprovements } from "@/app/lib/query/hooks";

const AREA_LABELS: Record<NixSeekerImprovementArea, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  formatting: "Formatting / ATS",
  keywords: "Keywords",
  references: "References",
  other: "Other",
};

const PRIORITY_PILL: Record<NixSeekerPriority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

const RANKING_BADGE: Record<NixSeekerRankingPotential, string> = {
  low: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  strong: "bg-emerald-100 text-emerald-700",
};

const RANKING_LABEL: Record<NixSeekerRankingPotential, string> = {
  low: "Likely to rank low",
  medium: "Mid-pack ranking",
  strong: "Strong ranking potential",
};

export interface NixWizardPanelProps {
  hasCv: boolean;
}

export function NixWizardPanel(props: NixWizardPanelProps) {
  const hasCv = props.hasCv;
  const mutation = useCvNixWizardImprovements();
  const [copied, setCopied] = useState(false);

  const result = mutation.data;
  const errorMessage = mutation.error
    ? mutation.error instanceof Error
      ? mutation.error.message
      : "Nix could not review your CV right now."
    : null;
  const isLoading = mutation.isPending;

  const handleRun = () => {
    setCopied(false);
    mutation.mutate();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  return (
    <div className="bg-gradient-to-br from-[#f7f7ff] to-white rounded-xl border border-[#c0c0eb] p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <NixBadge />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nix Wizard</h2>
            <p className="text-sm text-gray-600 mt-1 max-w-xl">
              Let Nix read your CV and uploaded documents and tell you exactly what to change to
              rank higher when employers search. Suggestions use South African hiring norms (NQF,
              SAQA, ECSA, SACPCMP, etc.).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={!hasCv || isLoading}
          className="bg-[#323288] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#252560] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
          title={hasCv ? undefined : "Upload your CV first to use the Nix Wizard"}
        >
          {isLoading ? "Nix is reading…" : result ? "Re-run Nix Wizard" : "Run Nix Wizard"}
        </button>
      </div>

      {!hasCv && (
        <p className="text-xs text-gray-500 italic">
          Upload your CV above and Nix will review it the moment you press the button.
        </p>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      {isLoading && <NixLoadingShimmer />}

      {result && !isLoading && (
        <NixResultBlock assessment={result} copied={copied} onCopy={handleCopy} />
      )}
    </div>
  );
}

function NixBadge() {
  return (
    <div className="flex items-center justify-center w-10 h-10 bg-[#323288] text-white rounded-lg flex-shrink-0 font-semibold">
      Nix
    </div>
  );
}

function NixLoadingShimmer() {
  return (
    <div className="space-y-3">
      <div className="h-4 bg-[#e0e0f5] rounded animate-pulse w-1/2" />
      <div className="h-4 bg-[#e0e0f5] rounded animate-pulse w-3/4" />
      <div className="h-4 bg-[#e0e0f5] rounded animate-pulse w-2/3" />
    </div>
  );
}

function NixResultBlock(props: {
  assessment: NixSeekerCvAssessment;
  copied: boolean;
  onCopy: (text: string) => void;
}) {
  const a = props.assessment;
  const score = Math.max(0, Math.min(100, Math.round(a.overallScore)));
  const rankingClass = RANKING_BADGE[a.rankingPotential];
  const rankingLabel = RANKING_LABEL[a.rankingPotential];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-[#e0e0f5] p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">CV score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-[#323288]">{score}</span>
            <span className="text-sm text-gray-500">/ 100</span>
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${rankingClass}`}
        >
          {rankingLabel}
        </span>
      </div>

      {a.headline && (
        <p className="text-sm text-gray-800 leading-relaxed">
          <span className="font-semibold text-[#252560]">Nix says:</span> {a.headline}
        </p>
      )}

      {a.strengths.length > 0 && (
        <SectionHeading title="What's already working">
          <ul className="space-y-1.5">
            {a.strengths.map((s) => (
              <li key={s} className="text-sm text-gray-700 flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </SectionHeading>
      )}

      {a.improvements.length > 0 && (
        <SectionHeading title="What to fix to rank higher">
          <ul className="space-y-3">
            {a.improvements.map((imp, i) => (
              <ImprovementCard key={`${imp.area}-${i}`} item={imp} onCopy={props.onCopy} />
            ))}
          </ul>
        </SectionHeading>
      )}

      {a.keywordGaps.length > 0 && (
        <SectionHeading title="Keywords likely missing">
          <div className="flex flex-wrap gap-2">
            {a.keywordGaps.map((kw) => (
              <span
                key={kw}
                className="text-xs bg-[#f0f0fc] text-[#252560] px-2.5 py-1 rounded-full border border-[#c0c0eb]"
              >
                {kw}
              </span>
            ))}
          </div>
        </SectionHeading>
      )}

      {a.missingDocumentSuggestions.length > 0 && (
        <SectionHeading title="Documents that would strengthen your profile">
          <ul className="space-y-1.5">
            {a.missingDocumentSuggestions.map((d) => (
              <li key={d} className="text-sm text-gray-700 flex gap-2">
                <span className="text-[#7373c2] flex-shrink-0">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </SectionHeading>
      )}

      {a.rewriteSummary && (
        <SectionHeading title="Suggested professional summary">
          <div className="bg-white rounded-lg border border-[#e0e0f5] p-4 space-y-3">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {a.rewriteSummary}
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Paste this into your CV and re-upload to see your score lift.
              </p>
              <button
                type="button"
                onClick={() => props.onCopy(a.rewriteSummary as string)}
                className="text-xs font-medium text-[#323288] hover:text-[#252560] whitespace-nowrap"
              >
                {props.copied ? "Copied!" : "Copy summary"}
              </button>
            </div>
          </div>
        </SectionHeading>
      )}
    </div>
  );
}

function SectionHeading(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[#252560] uppercase tracking-wide">
        {props.title}
      </h3>
      {props.children}
    </div>
  );
}

function ImprovementCard(props: { item: NixSeekerCvImprovement; onCopy: (text: string) => void }) {
  const item = props.item;
  const priorityClass = PRIORITY_PILL[item.priority];
  const example = item.example;
  return (
    <li className="bg-white rounded-lg border border-[#e0e0f5] p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {AREA_LABELS[item.area]}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${priorityClass}`}>
          {item.priority} priority
        </span>
        <span className="text-xs text-gray-500">
          ranking impact: <span className="font-medium">{item.rankingImpact}</span>
        </span>
      </div>
      <p className="text-sm text-gray-800">
        <span className="font-semibold">Issue:</span> {item.finding}
      </p>
      <p className="text-sm text-gray-800">
        <span className="font-semibold">Fix:</span> {item.suggestion}
      </p>
      {example && (
        <div className="bg-[#f7f7ff] border border-[#e0e0f5] rounded p-3 mt-2 space-y-2">
          <p className="text-xs font-semibold text-[#252560] uppercase tracking-wide">Example</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{example}</p>
          <button
            type="button"
            onClick={() => props.onCopy(example)}
            className="text-xs font-medium text-[#323288] hover:text-[#252560]"
          >
            Copy example
          </button>
        </div>
      )}
    </li>
  );
}
