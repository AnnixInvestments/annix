"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
import {
  guideVisibleToRole,
  type HowToHeading,
  type HowToRole,
  slugifyHeading,
} from "@/app/stock-control/how-to/types";

interface ViewerGuide {
  title: string;
  slug: string;
  category: string;
  roles: HowToRole[];
  tags: string[];
  lastUpdated: string;
  summary: string;
  readingMinutes: number;
  body: string;
}

interface ViewerLink {
  slug: string;
  title: string;
}

interface HowToViewerClientProps {
  guide: ViewerGuide;
  headings: HowToHeading[];
  prev: ViewerLink | null;
  next: ViewerLink | null;
}

const RECENT_KEY = "stock-control-how-to-recent";
const HELPFUL_KEY_PREFIX = "stock-control-how-to-helpful:";

export default function HowToViewerClient(props: HowToViewerClientProps) {
  const { user } = useStockControlAuth();
  const { effectiveRole } = useViewAs();
  const router = useRouter();
  const role = effectiveRole || user?.role || null;
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);

  const visible = useMemo(() => guideVisibleToRole(props.guide, role), [props.guide, role]);

  useEffect(() => {
    if (!visible && role !== null) {
      router.replace("/stock-control/portal/how-to");
    }
  }, [visible, role, router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(parsed)
        ? parsed.filter((s) => typeof s === "string" && s !== props.guide.slug)
        : [];
      const next = [props.guide.slug, ...filtered].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to record recent guide", e);
    }
  }, [props.guide.slug]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${HELPFUL_KEY_PREFIX}${props.guide.slug}`);
      if (stored === "yes" || stored === "no") setHelpful(stored);
    } catch (e) {
      console.warn("Failed to read helpful state", e);
    }
  }, [props.guide.slug]);

  const recordHelpful = (value: "yes" | "no") => {
    setHelpful(value);
    try {
      localStorage.setItem(`${HELPFUL_KEY_PREFIX}${props.guide.slug}`, value);
    } catch (e) {
      console.warn("Failed to store helpful state", e);
    }
  };

  if (!visible) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1 flex-wrap">
        <Link href="/stock-control/portal/how-to" className="hover:text-teal-600">
          How To
        </Link>
        <span>/</span>
        <span>{props.guide.category}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{props.guide.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-8">
        <article className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 print:shadow-none print:border-0">
          <header className="mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{props.guide.title}</h1>
            <p className="text-sm text-gray-600">{props.guide.summary}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 flex-wrap">
              <span>{props.guide.readingMinutes} min read</span>
              {props.guide.lastUpdated && <span>Updated {props.guide.lastUpdated}</span>}
              {props.guide.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-100">
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-a:text-teal-600 prose-code:text-teal-700 prose-code:bg-gray-50 prose-code:px-1 prose-code:rounded">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => {
                  const text = String(children);
                  return <h2 id={slugifyHeading(text)}>{children}</h2>;
                },
                h3: ({ children }) => {
                  const text = String(children);
                  return <h3 id={slugifyHeading(text)}>{children}</h3>;
                },
              }}
            >
              {props.guide.body}
            </ReactMarkdown>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 print:hidden">
            <p className="text-sm font-medium text-gray-700 mb-2">Was this guide helpful?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => recordHelpful("yes")}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition ${
                  helpful === "yes"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => recordHelpful("no")}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition ${
                  helpful === "no"
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-rose-400"
                }`}
              >
                No
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 print:hidden">
            {props.prev ? (
              <Link
                href={`/stock-control/portal/how-to/${props.prev.slug}`}
                className="text-xs text-gray-600 hover:text-teal-600 flex-1"
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Previous</div>
                <div className="font-medium truncate">{props.prev.title}</div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {props.next ? (
              <Link
                href={`/stock-control/portal/how-to/${props.next.slug}`}
                className="text-xs text-gray-600 hover:text-teal-600 text-right flex-1"
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Next</div>
                <div className="font-medium truncate">{props.next.title}</div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </article>

        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              On this page
            </h3>
            <nav className="text-xs space-y-1">
              {props.headings.map((h) => (
                <a
                  key={h.anchor}
                  href={`#${h.anchor}`}
                  className={`block text-gray-600 hover:text-teal-600 ${h.level === 3 ? "pl-3" : ""}`}
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
