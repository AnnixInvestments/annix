"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserBaseUrl } from "@/lib/api-config";

const MarkdownPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false },
);

interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  content: string;
  heroImageUrl: string | null;
  isHomePage: boolean;
}

export default function AuIndustriesHomePage() {
  const [page, setPage] = useState<WebsitePage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = browserBaseUrl();
    fetch(`${base}/public/au-industries/home`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => setPage(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">AU Industries</h1>
        <p className="text-gray-400 text-lg mb-8">
          Specialists in rubber lining, rubber sheeting, HDPE lining, and industrial rubber
          solutions.
        </p>
        <Link
          href="/au-industries/contact"
          className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Contact Us
        </Link>
      </div>
    );
  }

  return (
    <div>
      {page.heroImageUrl && (
        <div
          className="relative h-80 md:h-96 bg-cover bg-center"
          style={{ backgroundImage: `url(${page.heroImageUrl})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative max-w-4xl mx-auto px-4 h-full flex items-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white">{page.title}</h1>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        {!page.heroImageUrl && <h1 className="text-4xl font-bold text-white mb-8">{page.title}</h1>}
        <div data-color-mode="dark" className="prose prose-invert max-w-none">
          <MarkdownPreview source={page.content} style={{ backgroundColor: "transparent" }} />
        </div>
      </div>
    </div>
  );
}
