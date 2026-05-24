"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { nowMillis } from "@/app/lib/datetime";
import { useBranding } from "@/app/lib/query/hooks";
import { BrandNavLogo } from "./BrandNavLogo";
import type { ExtractionBrand, ExtractionState } from "./ExtractionProgressModal";

interface BrandStyle {
  label: string;
  bar: string;
  bg: string;
  text: string;
  logo: string | null;
}

const BRAND_STYLES: Record<ExtractionBrand, BrandStyle> = {
  "au-rubber": {
    label: "AU Rubber",
    bar: "bg-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-700",
    logo: "/au-industries/logo.jpg",
  },
  "stock-control": {
    label: "Stock Control",
    bar: "bg-red-700",
    bg: "bg-red-50",
    text: "text-red-700",
    logo: null,
  },
  rfq: {
    label: "RFQ",
    bar: "bg-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-700",
    logo: null,
  },
  "annix-sentinel": {
    label: "Annix Sentinel",
    bar: "bg-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    logo: null,
  },
  fieldflow: {
    label: "FieldFlow",
    bar: "bg-cyan-600",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    logo: null,
  },
  "annix-rep": {
    label: "Annix Rep",
    bar: "bg-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-700",
    logo: null,
  },
  "annix-orbit": {
    label: "Annix Orbit",
    bar: "bg-indigo-700",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    logo: "/branding/annix-orbit-icon.svg",
  },
  "teacher-assistant": {
    label: "Teacher Assistant",
    bar: "bg-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-700",
    logo: null,
  },
  insights: {
    label: "Annix Insights",
    bar: "bg-yellow-500",
    bg: "bg-gray-900",
    text: "text-yellow-400",
    logo: null,
  },
};

export default function ExtractionProgressModalView(props: { state: ExtractionState | null }) {
  const { state } = props;
  const [tickMs, setTickMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Annix Orbit pulls its logo + wordmark live from the branding page so an
  // admin's uploaded artwork flows straight through to this popup.
  const { data: orbitBranding } = useBranding("annix-orbit");

  useEffect(() => {
    if (!state) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTickMs(0);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTickMs(nowMillis() - state.startedAt);
    }, 200);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state]);

  if (!state) return null;
  const docRef = globalThis.document;
  if (!docRef) return null;

  const styles = BRAND_STYLES[state.brand];
  const isOrbit = state.brand === "annix-orbit";
  const orbitNavbar = orbitBranding ? orbitBranding.navbarColor : "#323288";
  const orbitAccent = orbitBranding ? orbitBranding.accentOrange : "#FF8A00";
  const totalMs = state.estimatedDurationMs;
  const elapsedMs = tickMs;
  const rawProgress = totalMs > 0 ? elapsedMs / totalMs : 0;
  const progress = Math.min(0.99, rawProgress);
  const percent = Math.round(progress * 100);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const overran = elapsedMs > totalMs;
  const itemCount = state.itemCount;

  // Batch-level progress — only rendered when more than one document
  // is queued. Combines the current doc's intra-doc progress with
  // the count of completed docs to give a smooth overall bar.
  const batch = state.batch;
  const showBatch = !!batch && batch.total > 1;
  const batchPercent = showBatch
    ? Math.min(99, Math.round(((batch.currentIndex - 1 + progress) / batch.total) * 100))
    : 0;
  const batchElapsedMs = showBatch ? Math.max(0, nowMillis() - batch.startedAt) : 0;
  const batchEstimatedTotalMs = showBatch ? batch.avgPerDocMs * batch.total : 0;
  const batchRemainingMs = showBatch ? Math.max(0, batchEstimatedTotalMs - batchElapsedMs) : 0;
  const batchRemainingSec = Math.ceil(batchRemainingMs / 1000);
  const batchElapsedSec = Math.floor(batchElapsedMs / 1000);
  const batchRemainingDisplay =
    batchRemainingSec >= 60
      ? `${Math.floor(batchRemainingSec / 60)}m ${batchRemainingSec % 60}s`
      : `${batchRemainingSec}s`;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden">
        {isOrbit && orbitBranding ? (
          <div
            className="flex items-center justify-between px-6 py-3.5 text-white"
            style={{ backgroundColor: orbitNavbar }}
          >
            <BrandNavLogo brand="annix-orbit" isOrbit />
            <span className="text-xs text-white/80">
              {elapsedSeconds}s elapsed
              {!overran && remainingSeconds > 0 ? ` · ~${remainingSeconds}s left` : ""}
            </span>
          </div>
        ) : (
          <div
            className={`px-4 py-2 ${styles.bg} ${styles.text} flex items-center justify-between`}
          >
            <span className="flex items-center gap-2">
              {styles.logo ? (
                <img
                  src={styles.logo}
                  alt={`${styles.label} logo`}
                  className="h-5 w-5 rounded-sm object-contain"
                />
              ) : null}
              <span className="text-xs font-semibold uppercase tracking-wide">{styles.label}</span>
            </span>
            <span className="text-[10px]">
              {elapsedSeconds}s elapsed
              {!overran && remainingSeconds > 0 ? ` · ~${remainingSeconds}s left` : ""}
            </span>
          </div>
        )}
        <div className="p-6">
          <p className="text-base font-medium text-gray-900">{state.label}</p>
          {itemCount != null && (
            <p className="text-sm text-gray-500 mt-1">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          )}
          <div className="mt-4 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            {isOrbit ? (
              <div
                className="h-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: orbitAccent }}
              />
            ) : (
              <div
                className={`h-full ${styles.bar} transition-all`}
                style={{ width: `${percent}%` }}
              />
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {overran
              ? "Taking longer than estimated — still working…"
              : `${percent}% — please leave this window open`}
          </p>

          {showBatch && batch && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-[11px] text-gray-700">
                <span className="font-medium">
                  Batch progress — document {batch.currentIndex} of {batch.total}
                </span>
                <span className="tabular-nums text-gray-500">
                  {batchElapsedSec}s elapsed
                  {batchRemainingSec > 0 ? ` · ~${batchRemainingDisplay} left` : ""}
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${styles.bar} opacity-70 transition-all`}
                  style={{ width: `${batchPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-gray-500">
                {batchPercent}% of the queued documents complete
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    docRef.body,
  );
}
