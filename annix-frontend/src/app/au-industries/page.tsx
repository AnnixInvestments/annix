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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" />
      </div>
    );
  }

  return (
    <div>
      <section
        className="relative h-[550px] md:h-[650px] bg-cover bg-center"
        style={{ backgroundImage: "url(/au-industries/hero-excavator.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wider leading-tight mb-10">
            Rubber Products, Linings and Mining Solutions in Boksburg
          </h1>
          <Link
            href="/au-industries/products-and-services"
            className="inline-block px-12 py-4 bg-[#B8860B] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
          >
            Our Services
          </Link>
        </div>
      </section>

      {page && (
        <section className="bg-white py-20">
          <div className="max-w-4xl mx-auto px-4">
            <div
              data-color-mode="light"
              className="prose prose-lg max-w-none prose-headings:text-[#B8860B] prose-headings:uppercase prose-headings:tracking-wide prose-headings:border-b-[3px] prose-headings:border-[#B8860B] prose-headings:pb-3 prose-headings:inline-block prose-strong:text-gray-900 prose-li:text-gray-600"
            >
              <MarkdownPreview source={page.content} style={{ backgroundColor: "transparent" }} />
            </div>
          </div>
        </section>
      )}

      {!page && (
        <section className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-4">
              About Us
            </h2>
            <p className="text-gray-600 text-lg">
              AU Industries was founded to provide high-quality rubber products, linings, and mining
              solutions at competitive prices with fast turnaround times.
            </p>
            <Link
              href="/au-industries/contact"
              className="inline-block mt-8 px-8 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
