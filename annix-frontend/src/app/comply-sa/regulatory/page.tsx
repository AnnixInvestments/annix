"use client";

import { Calendar, ExternalLink, Newspaper } from "lucide-react";
import { useState } from "react";
import { formatDateZA, fromISO } from "@/app/lib/datetime";
import {
  useRegulatoryUpdates,
  useRegulatoryUpdatesByCategory,
} from "@/app/lib/query/hooks";

type RegulatoryUpdate = {
  id: string;
  title: string;
  summary: string;
  category: string;
  effectiveDate: string;
  sourceUrl: string | null;
  affectedAreas: string[];
};

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "tax", label: "Tax" },
  { key: "corporate", label: "Corporate" },
  { key: "privacy", label: "Privacy" },
  { key: "labour", label: "Labour" },
  { key: "safety", label: "Safety" },
  { key: "municipal", label: "Municipal" },
];

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  corporate: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  privacy: "bg-green-500/10 text-green-400 border-green-500/30",
  labour: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  safety: "bg-red-500/10 text-red-400 border-red-500/30",
  municipal: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

function categoryStyle(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-500/10 text-slate-400 border-slate-500/30";
}

function UpdateCard({ update }: { update: RegulatoryUpdate }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-white">{update.title}</h3>
        <span
          className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryStyle(update.category)}`}
        >
          {update.category}
        </span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">{update.summary}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          Effective: {formatDateZA(update.effectiveDate)}
        </span>

        {update.sourceUrl && (
          <a
            href={update.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 transition-colors"
          >
            Source
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {update.affectedAreas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {update.affectedAreas.map((area) => (
            <span
              key={area}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300"
            >
              {area}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-36 bg-slate-700 rounded-xl" />
      ))}
    </div>
  );
}

export default function RegulatoryPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const allUpdates = useRegulatoryUpdates();
  const categoryUpdates = useRegulatoryUpdatesByCategory(
    activeCategory === "all" ? "" : activeCategory,
  );

  const activeQuery = activeCategory === "all" ? allUpdates : categoryUpdates;
  const updates = (activeQuery.data ?? []) as RegulatoryUpdate[];
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;

  const sortedUpdates = [...updates].sort(
    (a, b) => fromISO(b.effectiveDate).toMillis() - fromISO(a.effectiveDate).toMillis(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Newspaper className="h-7 w-7 text-teal-400" />
          Regulatory Updates
        </h1>
        <p className="text-slate-400 mt-1">
          Latest South African regulatory changes and compliance news
        </p>
      </div>

      <div className="border-b border-slate-700">
        <div className="flex overflow-x-auto -mb-px">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeCategory === cat.key
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error.message}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : sortedUpdates.length > 0 ? (
        <div className="space-y-4">
          {sortedUpdates.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Newspaper className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No regulatory updates for this category</p>
          <p className="text-sm text-slate-500 mt-1">Check back later for new updates</p>
        </div>
      )}
    </div>
  );
}
