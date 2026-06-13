"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { providerBadgeLabel, sourceNameFromUrl } from "@/app/lib/annix-orbit/provider-labels";
import type { SeekerRecommendedJob } from "@/app/lib/api/annixOrbitApi";

export interface DismissReasonOption {
  code: string;
  label: string;
}

interface SeekerJobCardProps {
  match: SeekerRecommendedJob;
  onApply: (match: SeekerRecommendedJob) => void;
  onDismiss: (matchId: number, reason?: string) => void;
  dismissReasons?: DismissReasonOption[];
  onMuteCompany?: (company: string) => void;
  onMuteCategory?: (category: string) => void;
  onReportDelisted?: (externalJobId: number) => void;
  isDismissing?: boolean;
}

export function SeekerJobCard(props: SeekerJobCardProps) {
  const match = props.match;
  const job = match.job;
  const isLocked = match.locked === true;

  if (isLocked) {
    return <LockedJobCard match={match} />;
  }
  const muteCompanyHandler = props.onMuteCompany;
  const muteCategoryHandler = props.onMuteCategory;
  const hasMuteOptions = Boolean(muteCompanyHandler) || Boolean(muteCategoryHandler);
  const propsDismissReasons = props.dismissReasons;
  const dismissReasonOptions = propsDismissReasons ? propsDismissReasons : [];
  const overall = Math.round(match.overallScore * 100);
  const matchDetails = match.matchDetails;
  const detailsReasoning = matchDetails ? matchDetails.reasoning : null;
  const reasoning = detailsReasoning || null;
  const detailsMatchedSkills = matchDetails ? matchDetails.skillsMatched : null;
  const matchedSkills = detailsMatchedSkills || [];
  const detailsMissingSkills = matchDetails ? matchDetails.skillsMissing : null;
  const missingSkills = detailsMissingSkills || [];
  const provider = job.sourceProvider;
  const providerLabel = providerBadgeLabel(provider);
  const salaryLabel = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const sourceUrl = job.sourceUrl;
  const sourceHref = sourceUrl || "#";
  const applyLabel = sourceUrl
    ? `Apply on ${sourceNameFromUrl(sourceUrl, provider)}`
    : "View & apply";
  const reportDelisted = props.onReportDelisted;

  const handleApply = () => {
    props.onApply(match);
  };

  const handleDismiss = (reason: string) => {
    props.onDismiss(match.matchId, reason);
  };

  const handleReportDelisted = () => {
    if (reportDelisted) reportDelisted(match.externalJobId);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
          <div className="text-sm text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-2">
            {job.company ? <span>{job.company}</span> : null}
            {job.locationRaw ? <span>· {job.locationRaw}</span> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {providerLabel ? (
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
            >
              {providerLabel}
            </a>
          ) : null}
          {salaryLabel ? (
            <span className="text-sm font-medium text-emerald-700">{salaryLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">Match {overall}%</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand-navbar,#323288)] rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, overall))}%` }}
            />
          </div>
        </div>
        {reasoning ? <p className="text-xs text-gray-500 mt-2">{reasoning}</p> : null}
      </div>

      {matchedSkills.length > 0 || missingSkills.length > 0 ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 mb-1.5">
            {matchedSkills.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-emerald-200 border border-emerald-300"
                />
                Skills you have
              </span>
            ) : null}
            {missingSkills.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-amber-200 border border-amber-300"
                />
                Skills to develop
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.slice(0, 6).map((skill) => (
              <span
                key={`matched-${skill}`}
                className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {skill}
              </span>
            ))}
            {missingSkills.slice(0, 4).map((skill) => (
              <span
                key={`missing-${skill}`}
                className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <div className="relative flex items-center">
          <DismissReasonMenu
            reasons={dismissReasonOptions}
            onDismiss={handleDismiss}
            disabled={props.isDismissing}
          />
          {hasMuteOptions ? (
            <MoreOptionsMenu
              company={muteCompanyHandler ? job.company : null}
              category={muteCategoryHandler ? job.category : null}
              onMuteCompany={muteCompanyHandler}
              onMuteCategory={muteCategoryHandler}
            />
          ) : null}
        </div>
        <a
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleApply}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
        >
          {applyLabel}
        </a>
      </div>

      {reportDelisted ? (
        <div className="mt-2 border-t border-gray-100 pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleReportDelisted}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600"
          >
            <span aria-hidden="true">⚑</span>
            Job Delisted
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface AnchoredMenuCoords {
  top: number;
  left: number;
}

function useAnchoredMenu() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<AnchoredMenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensUpward = spaceBelow < menuHeight + margin && rect.top > spaceBelow;
    const top = opensUpward ? Math.max(margin, rect.top - menuHeight - 4) : rect.bottom + 4;
    const maxLeft = window.innerWidth - menuWidth - margin;
    const left = Math.max(margin, Math.min(rect.left, maxLeft));
    setCoords({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (trigger?.contains(target)) return;
      if (menu?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return { open, setOpen, coords, triggerRef, menuRef };
}

function DismissReasonMenu(props: {
  reasons: DismissReasonOption[];
  onDismiss: (reason: string) => void;
  disabled?: boolean;
}) {
  const menu = useAnchoredMenu();
  const open = menu.open;
  const coords = menu.coords;
  const setOpen = menu.setOpen;
  const menuTop = coords ? coords.top : 0;
  const menuLeft = coords ? coords.left : 0;
  const menuVisibility = coords ? "visible" : "hidden";

  return (
    <>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={props.disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700 disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden="true" className="text-base leading-none">
          ✕
        </span>
        Not for me
      </button>
      {open
        ? createPortal(
            <div
              ref={menu.menuRef}
              role="menu"
              className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg min-w-[220px] max-h-[60vh] overflow-y-auto py-1"
              style={{ top: menuTop, left: menuLeft, visibility: menuVisibility }}
            >
              <p className="px-3 pt-1 pb-1.5 text-[11px] font-medium text-gray-400">
                Why isn't this for you?
              </p>
              {props.reasons.map((reason) => (
                <button
                  key={reason.code}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    props.onDismiss(reason.code);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {reason.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

interface MoreOptionsMenuProps {
  company: string | null;
  category: string | null;
  onMuteCompany?: (company: string) => void;
  onMuteCategory?: (category: string) => void;
}

function MoreOptionsMenu(props: MoreOptionsMenuProps) {
  const menu = useAnchoredMenu();
  const open = menu.open;
  const coords = menu.coords;
  const setOpen = menu.setOpen;
  const menuTop = coords ? coords.top : 0;
  const menuLeft = coords ? coords.left : 0;
  const menuVisibility = coords ? "visible" : "hidden";

  const company = props.company;
  const category = props.category;
  const muteCompany = props.onMuteCompany;
  const muteCategory = props.onMuteCategory;
  const showCompany = Boolean(muteCompany && company);
  const showCategory = Boolean(muteCategory && category);

  return (
    <>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-2 text-sm text-gray-400 hover:text-gray-600"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯
      </button>
      {open
        ? createPortal(
            <div
              ref={menu.menuRef}
              role="menu"
              className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] max-h-[60vh] overflow-y-auto"
              style={{ top: menuTop, left: menuLeft, visibility: menuVisibility }}
            >
              {showCompany && company ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (muteCompany) muteCompany(company);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Mute "{company}"
                </button>
              ) : null}
              {showCategory && category ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (muteCategory) muteCategory(category);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Hide "{category}" roles
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function LockedJobCard(props: { match: SeekerRecommendedJob }) {
  const recommended = props.match;
  const job = recommended.job;
  const lockedSourceRaw = recommended.lockedSourceName;
  const lockedSourceName = lockedSourceRaw || null;
  const sourceLabel = lockedSourceName || "a premium job board";
  const company = job.company;
  const teaserCompany = company ? `${company.slice(0, 1)}•••••` : "Premium employer";
  return (
    <div className="relative bg-white rounded-xl border border-violet-200 p-5 overflow-hidden">
      <div className="select-none blur-[3px] pointer-events-none" aria-hidden="true">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
        <div className="text-sm text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-2">
          <span>{teaserCompany}</span>
          {job.locationArea ? <span>· {job.locationArea}</span> : null}
        </div>
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-transparent">
            premium
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-transparent">
            listing
          </span>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 text-center px-4">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 text-violet-700 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0-1.105.895-2 2-2s2 .895 2 2-.895 2-2 2-2-.895-2-2zM5 11V7a7 7 0 0114 0v4M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z"
            />
          </svg>
        </span>
        <p className="text-sm font-semibold text-gray-900">Premium listing from {sourceLabel}</p>
        <p className="text-xs text-gray-600 mt-1 max-w-xs">
          Upgrade to the Heavy plan to unlock jobs from our premium partner boards.
        </p>
      </div>
    </div>
  );
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const symbol = currency === "ZAR" ? "R" : currency ? `${currency} ` : "";
  if (min != null && max != null) {
    return `${symbol}${formatThousands(min)} - ${symbol}${formatThousands(max)}`;
  }
  if (min != null) return `From ${symbol}${formatThousands(min)}`;
  if (max != null) return `Up to ${symbol}${formatThousands(max)}`;
  return null;
}

function formatThousands(n: number): string {
  return Math.round(n).toLocaleString("en-ZA");
}
