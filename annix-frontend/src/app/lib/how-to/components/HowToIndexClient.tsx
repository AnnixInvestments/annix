"use client";

import { toPairs as entries, isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { guideVisibleToRole, type HowToGuideFrontmatter, isAdminOnly } from "../types";

interface IndexGuide extends Omit<HowToGuideFrontmatter, "relatedPaths"> {}

interface HowToCardProps {
  guide: IndexGuide;
  basePath: string;
  adminRole: string;
}

function HowToCard(props: HowToCardProps) {
  const guide = props.guide;
  const adminOnly = isAdminOnly(guide, props.adminRole);
  return (
    <Link
      href={`${props.basePath}/${guide.slug}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:border-teal-400 hover:shadow-md transition p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{guide.title}</h3>
        {adminOnly && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Admin
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 line-clamp-2 mb-3">{guide.summary}</p>
      <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {guide.readingMinutes} min
        </span>
        {guide.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

export interface HowToIndexClientProps {
  guides: IndexGuide[];
  role: string | null;
  allRoles: readonly string[];
  adminRole: string;
  basePath: string;
  recentKey: string;
  heading?: string;
  subheading?: string;
}

export default function HowToIndexClient(props: HowToIndexClientProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(props.recentKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isArray(parsed)) {
          setRecent(parsed.filter((v) => isString(v)));
        }
      }
    } catch (e) {
      console.warn("Failed to read recent guides", e);
    }
  }, [props.recentKey]);

  const visibleGuides = useMemo(
    () => props.guides.filter((g) => guideVisibleToRole(g, props.role, props.allRoles)),
    [props.guides, props.role, props.allRoles],
  );

  const categories = useMemo(() => {
    return visibleGuides.reduce<string[]>((seen, g) => {
      if (seen.includes(g.category)) return seen;
      return [...seen, g.category];
    }, []);
  }, [visibleGuides]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleGuides.filter((g) => {
      if (activeCategory && g.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = `${g.title} ${g.summary} ${g.tags.join(" ")} ${g.category}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [visibleGuides, query, activeCategory]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, IndexGuide[]>>((groups, g) => {
      const rawCategory = groups[g.category];
      const list = rawCategory || [];
      return { ...groups, [g.category]: [...list, g] };
    }, {});
  }, [filtered]);

  const recentGuides = useMemo(() => {
    if (recent.length === 0 || query.trim() || activeCategory) return [];
    return recent
      .map((slug) => visibleGuides.find((g) => g.slug === slug))
      .filter((g): g is IndexGuide => Boolean(g))
      .slice(0, 4);
  }, [recent, visibleGuides, query, activeCategory]);

  const rawHeading = props.heading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{rawHeading || "How To Guides"}</h1>
        {props.subheading && <p className="text-sm text-gray-600 mt-1">{props.subheading}</p>}
      </div>
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides by title, tag, or keyword..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
            activeCategory === null
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
              activeCategory === cat
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      {recentGuides.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recently viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentGuides.map((g) => (
              <HowToCard
                key={g.slug}
                guide={g}
                basePath={props.basePath}
                adminRole={props.adminRole}
              />
            ))}
          </div>
        </section>
      )}
      {filtered.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No guides match your search.</p>
        </div>
      )}
      <div className="space-y-8">
        {entries(grouped).map(([category, guides]) => (
          <section key={category}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guides.map((g) => (
                <HowToCard
                  key={g.slug}
                  guide={g}
                  basePath={props.basePath}
                  adminRole={props.adminRole}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
