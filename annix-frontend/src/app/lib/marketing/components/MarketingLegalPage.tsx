import Link from "next/link";
import { fetchPublishedMarketingContent } from "../api";
import { LegalDocBody } from "./views/LegalView";

const LEGAL_PAGES = [
  { key: "privacy", href: "/privacy", label: "Privacy Policy" },
  { key: "terms", href: "/terms", label: "Terms of Use" },
  { key: "cookies", href: "/cookies", label: "Cookie Policy" },
] as const;

export type MarketingLegalDocKey = (typeof LEGAL_PAGES)[number]["key"];

export async function MarketingLegalPage(props: { doc: MarketingLegalDocKey }) {
  const content = await fetchPublishedMarketingContent();
  const doc = content.legal[props.doc];
  return (
    <div
      className="min-h-screen px-4 py-16 text-white sm:px-6 lg:px-8"
      style={{
        backgroundColor: "#0a1733",
        backgroundImage: "linear-gradient(180deg, #0b1b3a 0%, #0a1733 45%, #070f24 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
          {content.site.wordmark}
        </p>
        <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">{doc.heading}</h1>
        {doc.lastUpdated ? (
          <p className="mt-3 text-sm text-white/40">Last updated: {doc.lastUpdated}</p>
        ) : null}
        <nav className="mt-6 flex gap-5 border-b border-white/10 pb-4 text-sm">
          {LEGAL_PAGES.map((page) => (
            <Link
              key={page.key}
              href={page.href}
              className={
                page.key === props.doc
                  ? "font-semibold text-white"
                  : "text-white/50 transition hover:text-white"
              }
            >
              {page.label}
            </Link>
          ))}
        </nav>
        <div className="mt-10">
          <LegalDocBody body={doc.body} />
        </div>
      </div>
    </div>
  );
}
