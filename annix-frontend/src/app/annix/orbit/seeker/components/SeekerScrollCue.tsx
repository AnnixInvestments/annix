"use client";

import { useEffect, useState } from "react";

const SCROLL_CUE_SEEN_KEY = "annix-orbit-seeker-scroll-cue-seen";
// Only cue when there's a meaningful amount below the fold.
const MIN_OVERFLOW_PX = 240;
const AUTO_HIDE_MS = 9000;

// First-run nudge so seekers realise the page scrolls — the tall hero on the
// Browse Jobs / dashboard pages made it look like the page ended above the
// fold (test feedback, 2026-06). Shows once, fades the moment the user
// scrolls, and never returns (dismissal persisted like the app-guide popup).
export function SeekerScrollCue() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(SCROLL_CUE_SEEN_KEY) === "true";
    } catch {
      seen = false;
    }
    if (seen) return;

    const overflows = () =>
      document.documentElement.scrollHeight - window.innerHeight > MIN_OVERFLOW_PX;

    // Wait a tick for content to lay out before measuring.
    const showTimer = window.setTimeout(() => {
      if (overflows() && window.scrollY < 40) setVisible(true);
    }, 700);

    const dismiss = () => {
      setVisible(false);
      try {
        window.localStorage.setItem(SCROLL_CUE_SEEN_KEY, "true");
      } catch {
        // Storage blocked — the in-memory hide still applies for this view.
      }
    };

    const onScroll = () => {
      if (window.scrollY > 40) dismiss();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const hideTimer = window.setTimeout(dismiss, AUTO_HIDE_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
      <div className="flex animate-bounce flex-col items-center gap-1 rounded-full bg-[var(--brand-navbar,#323288)]/90 px-4 py-2 text-white shadow-lg backdrop-blur">
        <span className="text-xs font-medium">Scroll to see your matches</span>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
