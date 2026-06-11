"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";

interface ExternalJobModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

type EmbedState = "checking" | "embeddable" | "blocked";

// Full-page in-app viewer for an external job listing. Keeps the seeker inside
// the app: the listing renders in an iframe under a branded header, and the X
// returns them straight to where they were. Many job boards refuse to be
// embedded (X-Frame-Options / CSP) and the browser gives no signal when it
// blocks a cross-origin frame, so the backend probes the site's headers first
// and blocked listings get an explicit open-in-new-tab panel instead of a
// silently blank frame.
export function ExternalJobModal(props: ExternalJobModalProps) {
  const { url, title, onClose } = props;
  const [embedState, setEmbedState] = useState<EmbedState>("checking");

  useEffect(() => {
    let cancelled = false;
    setEmbedState("checking");
    annixOrbitApiClient
      .checkSeekerJobEmbed(url)
      .then((result) => {
        if (!cancelled) {
          setEmbedState(result.embeddable ? "embeddable" : "blocked");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmbedState("blocked");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

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
      {embedState === "embeddable" ? (
        <iframe
          src={url}
          title={title}
          className="flex-1 w-full bg-white"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex-1 w-full bg-white flex items-center justify-center p-6">
          {embedState === "checking" ? (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-navbar,#323288)]" />
              <p className="text-sm">Loading job listing…</p>
            </div>
          ) : (
            <div className="max-w-md text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                This job site can't be shown inside the app
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                {title} is hosted on a site that doesn't allow embedding. Open it in a new tab to
                view and apply — this page will stay open so you can come straight back.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-5 px-5 py-2.5 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
              >
                Open job listing
              </a>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
