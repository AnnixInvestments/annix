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

  // Fires after each page renders. We use it to scroll to the target page
  // once IT has rendered — text-layer queries before render return nothing.
  const handlePageRender = useCallback(
    (pageNumber: number) => {
      if (!opts || !containerRef.current) return;
      const optsPage = opts.page;
      const targetPage = optsPage ?? 1;
      if (pageNumber !== targetPage) return;

      const pageNode = containerRef.current.querySelector<HTMLElement>(
        `[data-page-number="${targetPage}"]`,
      );
      if (!pageNode) return;

      const rawHint = opts.searchHint;
      const hint = rawHint ? rawHint.trim() : "";
      if (hint.length >= 3) {
        const hit = findTextMatch(pageNode, hint);
        if (hit) {
          hit.scrollIntoView({ behavior: "smooth", block: "center" });
          flashHighlight(hit);
          return;
        }
      }
      pageNode.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [opts],
  );

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
            <a
              href={`/api/nix/extraction/${opts.extractionId}/document`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              Open in new tab
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
                    onRenderSuccess={() => handlePageRender(i + 1)}
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
 * Case-insensitive, whitespace-collapsed match, prefix-match-friendly so a
 * 6-word hint still finds the clause heading even if line wrapping splits it.
 */
function findTextMatch(pageNode: HTMLElement, hint: string): HTMLElement | null {
  const textLayer = pageNode.querySelector<HTMLElement>(".react-pdf__Page__textContent");
  if (!textLayer) return null;
  const needle = hint.toLowerCase().replace(/\s+/g, " ").trim();
  if (needle.length === 0) return null;
  const spans = textLayer.querySelectorAll<HTMLElement>("span");
  for (const span of Array.from(spans)) {
    const rawText = span.textContent;
    const text = (rawText ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    if (text.length === 0) continue;
    if (text.includes(needle) || needle.includes(text)) return span;
  }
  // Looser prefix match on the first 4 words of the hint.
  const prefix = needle.split(" ").slice(0, 4).join(" ");
  if (prefix.length >= 4 && prefix !== needle) {
    for (const span of Array.from(spans)) {
      const rawText = span.textContent;
      const text = (rawText ?? "").toLowerCase().replace(/\s+/g, " ").trim();
      if (text.length > 0 && text.includes(prefix)) return span;
    }
  }
  return null;
}

function flashHighlight(el: HTMLElement) {
  const original = el.style.backgroundColor;
  el.style.backgroundColor = "rgba(250, 204, 21, 0.6)";
  el.style.transition = "background-color 1.2s ease-out";
  globalThis.setTimeout(() => {
    el.style.backgroundColor = original;
  }, 1500);
}
