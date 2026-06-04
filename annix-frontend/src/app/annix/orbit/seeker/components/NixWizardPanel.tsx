"use client";

import { isNumber } from "es-toolkit/compat";
import { useEffect, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import type {
  NixSeekerCvAssessment,
  NixSeekerCvImprovement,
  NixSeekerImprovementArea,
  NixSeekerPriority,
  NixSeekerRankingPotential,
} from "@/app/lib/api/annixOrbitApi";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { useOrbitNixWizardImprovements } from "@/app/lib/query/hooks";
import { useFeatureFlagEnabled } from "@/app/lib/query/hooks/useFeatureFlagEnabled";
import { NixCvBuilder } from "./NixCvBuilder";

const NIX_REVIEW_ESTIMATED_MS = 12000;
const NIX_CV_BUILDER_FLAG = "ANNIX_ORBIT_NIX_CV_BUILDER";

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
  autoRunKey?: number;
}

export function NixWizardPanel(props: NixWizardPanelProps) {
  const hasCv = props.hasCv;
  const autoRunKey = props.autoRunKey;
  const mutation = useOrbitNixWizardImprovements();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const lastAutoRunKey = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mutate = mutation.mutate;
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const isLoading = mutation.isPending;
  const cvBuilderFlag = useFeatureFlagEnabled(NIX_CV_BUILDER_FLAG);
  const cvBuilderResolved = !cvBuilderFlag.isLoading;
  const cvBuilderEnabled = cvBuilderResolved && cvBuilderFlag.enabled;
  const [reviewEstimateMs, setReviewEstimateMs] = useState(NIX_REVIEW_ESTIMATED_MS);

  useEffect(() => {
    if (!hasCv) return;
    if (!isNumber(autoRunKey)) return;
    if (autoRunKey <= 0) return;
    if (lastAutoRunKey.current === autoRunKey) return;
    lastAutoRunKey.current = autoRunKey;
    setCopied(false);
    mutate();
    const node = panelRef.current;
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [autoRunKey, hasCv, mutate]);

  useEffect(() => {
    metricsApi
      .extractionStats("annix-orbit-nix-seeker", "cv-improvements")
      .then((stats) => {
        if (stats.averageMs) setReviewEstimateMs(stats.averageMs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) {
      showExtraction({
        brand: "annix-orbit",
        label: "Nix is reviewing your CV…",
        estimatedDurationMs: reviewEstimateMs,
      });
    } else {
      hideExtraction();
    }
    return () => {
      hideExtraction();
    };
  }, [isLoading, reviewEstimateMs, showExtraction, hideExtraction]);

  const result = mutation.data;
  const errorMessage = mutation.error
    ? "Nix could not review your CV right now. Please try again."
    : null;

  const handleRun = () => {
    setCopied(false);
    mutate();
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
        showToast("Couldn't copy to your clipboard — please copy it manually", "error");
      });
  };

  return (
    <div
      ref={panelRef}
      className="rounded-xl border border-[var(--brand-navbar-200,#c0c0eb)] px-2 py-4 sm:p-6 space-y-4 scroll-mt-24"
      style={{
        backgroundImage:
          "linear-gradient(to bottom right, var(--brand-navbar-50,#f7f7ff), #ffffff)",
      }}
    >
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
          className="bg-[var(--brand-navbar,#323288)] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
          title={hasCv ? undefined : "Upload your CV first to use the Nix Wizard"}
        >
          {isLoading ? "Nix is reading…" : result ? "Re-run Nix Wizard" : "Run Nix Wizard"}
        </button>
      </div>

      {!hasCv && (
        <p className="text-xs text-gray-500 italic">
          Upload your CV above and Nix will review it automatically. You can also re-run the review
          any time by pressing the button.
        </p>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      {result && !isLoading && (
        <NixResultBlock assessment={result} copied={copied} onCopy={handleCopy} />
      )}

      {cvBuilderEnabled && <NixCvBuilder hasCv={hasCv} />}
    </div>
  );
}

function NixBadge() {
  return (
    <div className="flex items-center justify-center w-10 h-10 bg-[var(--brand-navbar,#323288)] text-white rounded-lg flex-shrink-0 font-semibold">
      Nix
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
      <div className="bg-white rounded-lg border border-[var(--brand-navbar-100,#e0e0f5)] px-2.5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">CV score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-[var(--brand-navbar,#323288)] dark:text-[#9ea0e8]">
              {score}
            </span>
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
          <span className="font-semibold text-[var(--brand-navbar-active,#252560)] dark:text-[#c0c0eb]">
            Nix says:
          </span>{" "}
          {a.headline}
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
                className="text-xs bg-[var(--brand-navbar-50,#f0f0fc)] text-[var(--brand-navbar-active,#252560)] px-2.5 py-1 rounded-full border border-[var(--brand-navbar-200,#c0c0eb)]"
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
                <span className="text-[var(--brand-navbar-400,#7373c2)] dark:text-[#9ea0e8] flex-shrink-0">
                  •
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </SectionHeading>
      )}

      {a.rewriteSummary && (
        <SectionHeading title="Suggested professional summary">
          <div className="bg-white rounded-lg border border-[var(--brand-navbar-100,#e0e0f5)] px-2 py-4 space-y-3">
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
                className="text-xs font-medium text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] dark:text-[#9ea0e8] dark:hover:text-[#c0c0eb] whitespace-nowrap"
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
      <h3 className="text-sm font-semibold text-[var(--brand-navbar-active,#252560)] dark:text-[#c0c0eb] uppercase tracking-wide">
        {props.title}
      </h3>
      {props.children}
    </div>
  );
}

function ImprovementCard(props: { item: NixSeekerCvImprovement; onCopy: (text: string) => void }) {
  const item = props.item;
  const priorityClass = PRIORITY_PILL[item.priority];
  const areaLabel = AREA_LABELS[item.area];
  const example = item.example;
  return (
    <li className="bg-white rounded-lg border border-[var(--brand-navbar-100,#e0e0f5)] px-2 py-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {areaLabel}
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
        <div className="bg-[var(--brand-navbar-50,#f7f7ff)] border border-[var(--brand-navbar-100,#e0e0f5)] rounded p-3 mt-2 space-y-2">
          <p className="text-xs font-semibold text-[var(--brand-navbar-active,#252560)] uppercase tracking-wide">
            Example
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{example}</p>
          <button
            type="button"
            onClick={() => props.onCopy(example)}
            className="text-xs font-medium text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)]"
          >
            Copy example
          </button>
        </div>
      )}
    </li>
  );
}
