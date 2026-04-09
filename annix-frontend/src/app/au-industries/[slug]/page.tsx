"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
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
  metaTitle: string | null;
  metaDescription: string | null;
  content: string;
  heroImageUrl: string | null;
}

export default function AuIndustriesSlugPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<WebsitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const base = browserBaseUrl();
    fetch(`${base}/public/au-industries/pages/${slug}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setPage(data);
          const pageTitle = data.metaTitle || data.title;
          document.title = `${pageTitle} | AU Industries`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc && data.metaDescription) {
            metaDesc.setAttribute("content", data.metaDescription);
          }
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Page Not Found</h1>
        <p className="text-gray-400">The page you are looking for does not exist.</p>
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
