"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ExternalJobModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

// Full-page in-app viewer for an external job listing. Keeps the seeker inside
// the app: the listing renders in an iframe under a branded header, and the X
// returns them straight to where they were. Some job boards refuse to be
// embedded (X-Frame-Options / CSP) — the header's "Open in new tab" link is the
// always-available fallback for those.
export function ExternalJobModal(props: ExternalJobModalProps) {
  const { url, title, onClose } = props;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/70">
      <div
        className="flex items-center justify-between gap-3 px-3 sm:px-4 h-14 shrink-0 shadow-md"
        style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <p className="text-[11px] text-white/60 truncate">
            If the job site doesn't load below, use "Open in new tab".
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open in new tab
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in new tab"
            className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and return to the app"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
      <iframe
        src={url}
        title={title}
        className="flex-1 w-full bg-white"
        referrerPolicy="no-referrer"
      />
    </div>,
    document.body,
  );
}
