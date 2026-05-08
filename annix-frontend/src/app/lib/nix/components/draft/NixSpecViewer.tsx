"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { anyPortalAuthHeaders } from "@/app/lib/api/portalTokenStores";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface NixSpecViewerOpts {
  /** Extraction id — viewer streams the source PDF through /api/nix/extraction/:id/document. */
  extractionId: number;
  filename: string;
  /** Page (1-indexed) to scroll to on open. */
  page?: number | null;
  /** Text to find on the target page; viewer scrolls past the page header to the matching span. */
  searchHint?: string | null;
}

interface NixSpecViewerState {
  isOpen: boolean;
  opts: NixSpecViewerOpts | null;
}

/**
 * A drop-in PDF preview specialised for Nix spec clauses. Replaces the
 * iframe-based PdfPreviewModal with react-pdf so we can programmatically
 * scroll to a specific clause — landing the user inside the clause body
 * instead of at the page header (which Chrome's iframe-PDF viewer does
 * with #page=N anchors).
 *
 * Behaviour after load:
 * 1. Scrolls the page=N container into view (top of the target page).
 * 2. If a searchHint was provided, walks that page's textLayer for the
 *    first text node matching the hint and scrolls IT into view instead,
 *    plus highlights it briefly so the user's eye locks on. The viewer
 *    falls back gracefully (just the page jump) if no match is found.
 */
export function useNixSpecViewer() {
  const [state, setState] = useState<NixSpecViewerState>({ isOpen: false, opts: null });

  const open = useCallback((opts: NixSpecViewerOpts) => {
    setState({ isOpen: true, opts });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, opts: null });
  }, []);

  return { state, open, close };
}

export function NixSpecViewerModal(props: { state: NixSpecViewerState; onClose: () => void }) {
  const { state, onClose } = props;
  const opts = state.opts;
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState<number>(900);
  const [error, setError] = useState<string | null>(null);

  // Resize listener — keep page width responsive to the modal width.
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const node = containerRef.current;
      if (!node) return;
      // Leave a little gutter so the page doesn't bump into the scrollbar.
      setPageWidth(Math.max(400, node.clientWidth - 32));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDocumentLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  }, []);

  // Fires after each page renders. Re-runs the scroll on every render —
  // continuous-scroll mode renders pages 1..N in parallel, and each
  // subsequent page increases the document height, shifting the matched
  // span. scrollIntoView is idempotent so re-running until the doc fully
  // loads converges on the right resting position. We highlight only once
  // (first hit) so the flash doesn't keep retriggering.
  const highlightedRef = useRef(false);
  const handlePageRender = useCallback(() => {
    if (!opts || !containerRef.current) return;
    const optsPage = opts.page;
    const targetPage = optsPage ?? 1;

    const pageNode = containerRef.current.querySelector<HTMLElement>(
      `[data-page-number="${targetPage}"]`,
    );
    if (!pageNode) return;

    const rawHint = opts.searchHint;
    const hint = rawHint ? rawHint.trim() : "";
    if (hint.length >= 3) {
      const hit = findTextMatch(pageNode, hint);
      if (hit) {
        hit.scrollIntoView({ behavior: "auto", block: "center" });
        if (!highlightedRef.current) {
          flashHighlight(hit);
          highlightedRef.current = true;
        }
        return;
      }
    }
    pageNode.scrollIntoView({ behavior: "auto", block: "start" });
  }, [opts]);

  // Reset the once-only highlight flag whenever a new opts arrives so a
  // second click (different clause) flashes again.
  useEffect(() => {
    highlightedRef.current = false;
  }, [opts]);

  // file= prop for react-pdf — uses our same-origin proxy route so PDF.js
  // can fetch the bytes without S3 CORS preflight failing. Auth header is
  // resolved fresh on open via the canonical PortalTokenStore registry.
  const fileOption = useMemo(() => {
    if (!opts) return null;
    return {
      url: `/api/nix/extraction/${opts.extractionId}/document`,
      httpHeaders: anyPortalAuthHeaders(),
      withCredentials: false,
    };
  }, [opts]);

  const isOpen = state.isOpen;
  if (!isOpen || !opts || !fileOption) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-8 flex flex-col bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 text-white">
          <div className="flex flex-col min-w-0 mr-4">
            <span className="text-sm font-medium truncate">{opts.filename}</span>
            {opts.page !== null && opts.page !== undefined && (
              <span className="text-[11px] text-gray-300">
                Page {opts.page}
                {opts.searchHint ? ` · highlighting "${opts.searchHint}"` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => downloadProxiedPdf(opts.extractionId, opts.filename)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors"
              title="Download PDF"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
            <button
              type="button"
              onClick={() => printProxiedPdf(opts.extractionId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors"
              title="Print PDF"
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
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button>
            <a
              href={`/api/nix/extraction/${opts.extractionId}/document`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors"
              title="Open in new tab"
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
              New tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded transition-colors ml-2"
              title="Close"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-200 px-4 py-4">
          {error ? (
            <div className="flex items-center justify-center h-full text-red-600 text-sm">
              {error}
            </div>
          ) : (
            <Document
              file={fileOption}
              onLoadSuccess={handleDocumentLoad}
              onLoadError={(err) => {
                const msg = err.message;
                setError(msg ?? "Failed to load PDF");
              }}
              loading={
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  Loading PDF…
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i + 1} className="mb-3 mx-auto shadow-md w-fit bg-white">
                  <Page
                    pageNumber={i + 1}
                    width={pageWidth}
                    renderTextLayer
                    renderAnnotationLayer={false}
                    onRenderSuccess={handlePageRender}
                    onRenderTextLayerSuccess={handlePageRender}
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Walks a page's text-layer for the first span whose text contains the hint.
 *
 * Both sides are aggressively normalised before comparing:
 *  - lowercased
 *  - all non-alphanumerics replaced with single spaces
 *  - whitespace collapsed
 *
 * This handles trademark / copyright glyphs (Linatex Linard® 60 → "linatex
 * linard 60"), em-dashes, line breaks, hyphens between words, and any other
 * separator the PDF text-layer happens to insert. PDFs from CAD tools often
 * split "Linatex Linard® 60" into multiple <span>s — we also fall back to
 * matching against the concatenation of the first ~120 chars of all spans.
 */
function findTextMatch(pageNode: HTMLElement, hint: string): HTMLElement | null {
  const textLayer = pageNode.querySelector<HTMLElement>(".react-pdf__Page__textContent");
  if (!textLayer) return null;
  const needle = normaliseForMatch(hint);
  if (needle.length === 0) return null;
  const spans = Array.from(textLayer.querySelectorAll<HTMLElement>("span"));

  const normalisedSpans = spans.map((span) => {
    const raw = span.textContent;
    return { span, text: normaliseForMatch(raw ?? "") };
  });

  // Pass 1: per-span containment — works when the entire hint sits in one span.
  const directHit = normalisedSpans.find(
    ({ text }) => text.length > 0 && (text.includes(needle) || needle.includes(text)),
  );
  if (directHit) return directHit.span;

  // Pass 2: looser prefix match on the first 4 words of the hint (handles
  // line-wrapped clause headings where only the first words sit in one span).
  const prefix = needle.split(" ").slice(0, 4).join(" ");
  if (prefix.length >= 4 && prefix !== needle) {
    const prefixHit = normalisedSpans.find(({ text }) => text.length > 0 && text.includes(prefix));
    if (prefixHit) return prefixHit.span;
  }

  // Pass 3: needle spans multiple <span> nodes. Walk a sliding window of
  // adjacent spans, concatenate their normalised text, and match the needle
  // against the joined string. Return the span where the needle starts.
  return findInWindow(normalisedSpans, needle, prefix);
}

function findInWindow(
  normalisedSpans: { span: HTMLElement; text: string }[],
  needle: string,
  prefix: string,
): HTMLElement | null {
  return normalisedSpans.reduce<HTMLElement | null>((found, _, i, arr) => {
    if (found) return found;
    const window = arr.slice(i, i + 6);
    const joined = window
      .map((entry) => entry.text)
      .filter((t) => t.length > 0)
      .join(" ");
    if (joined.length === 0 || joined.length > 400) return null;
    if (joined.includes(needle) || (prefix.length > 0 && joined.includes(prefix))) {
      return arr[i].span;
    }
    return null;
  }, null);
}

function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Triggers a download of the proxied PDF. Hits /api/nix/extraction/:id/
 * document with the user's auth header (the route returns the bytes as a
 * Blob), then converts to an object URL and clicks an anchor with download
 * attribute so the file lands in the user's Downloads folder with the
 * original filename.
 */
async function downloadProxiedPdf(extractionId: number, filename: string): Promise<void> {
  try {
    const response = await fetch(`/api/nix/extraction/${extractionId}/document`, {
      method: "GET",
      headers: anyPortalAuthHeaders(),
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    // Network error — modal stays open so the user can retry or use New tab.
  }
}

/**
 * Triggers the browser print dialog for the proxied PDF. Renders the PDF
 * into a hidden iframe so window.print() targets the document directly,
 * giving the user a clean print preview without leaving the modal.
 */
async function printProxiedPdf(extractionId: number): Promise<void> {
  try {
    const response = await fetch(`/api/nix/extraction/${extractionId}/document`, {
      method: "GET",
      headers: anyPortalAuthHeaders(),
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = objectUrl;
    iframe.onload = () => {
      const contentWindow = iframe.contentWindow;
      if (contentWindow) contentWindow.print();
      // Leave the iframe mounted while the print dialog is open; tear it
      // down on a long timeout so the dialog doesn't lose its source.
      globalThis.setTimeout(() => {
        try {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(objectUrl);
        } catch {
          // already cleaned up
        }
      }, 60_000);
    };
    document.body.appendChild(iframe);
  } catch {
    // Network error — the user can fall back to Open in new tab + browser print.
  }
}

function flashHighlight(el: HTMLElement) {
  const original = el.style.backgroundColor;
  el.style.backgroundColor = "rgba(250, 204, 21, 0.6)";
  el.style.transition = "background-color 1.2s ease-out";
  globalThis.setTimeout(() => {
    el.style.backgroundColor = original;
  }, 1500);
}
