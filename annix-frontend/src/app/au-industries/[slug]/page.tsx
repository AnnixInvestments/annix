"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
// eslint-disable-next-line no-restricted-imports -- AU Industries CMS uses dynamic slug routing with editable content; TanStack Query hook would require new public CMS content hook infrastructure. Tracked as tech debt.
import { browserBaseUrl } from "@/lib/api-config";
import { type CaseStudy, caseStudiesForService } from "../caseStudies";
import { useEditMode } from "../context/EditModeContext";
import { SERVICE_FAQS } from "../serviceFaqs";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
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
  const { editMode } = useEditMode();

  const [page, setPage] = useState<WebsitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
          setEditContent(data.content);
          const rawMetaTitle = data.metaTitle;
          const pageTitle = rawMetaTitle || data.title;
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

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await auRubberApiClient.updateWebsitePage(page.id, {
        content: editContent,
      });
      setPage({ ...page, content: editContent });
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage("Failed to save");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = page ? editContent !== page.content : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-500">The page you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div>
      {page.heroImageUrl && (
        <div
          className="relative h-64 md:h-80 bg-cover bg-center"
          style={{ backgroundImage: `url(${page.heroImageUrl})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative max-w-4xl mx-auto px-4 h-full flex items-center justify-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider text-center">
              {page.title}
            </h1>
          </div>
        </div>
      )}

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          {!page.heroImageUrl && (
            <h1 className="text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-8 pb-4 border-b-2 border-[#B8860B]">
              {page.title}
            </h1>
          )}

          {editMode ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  Editing markdown content — changes are saved directly to the live site
                </p>
                <div className="flex items-center gap-3">
                  {saveMessage && (
                    <span
                      className={`text-sm font-medium ${saveMessage === "Saved" ? "text-green-600" : "text-red-600"}`}
                    >
                      {saveMessage}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="px-5 py-2 text-sm font-semibold text-white bg-[#B8860B] rounded hover:bg-[#9A7209] disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
              <div data-color-mode="light">
                <MDEditor
                  value={editContent}
                  onChange={(val) => setEditContent(val || "")}
                  height={600}
                  preview="live"
                />
              </div>
            </div>
          ) : (
            <div
              data-color-mode="light"
              className="au-industries-content prose prose-lg max-w-none prose-headings:text-[#B8860B] prose-headings:uppercase prose-headings:tracking-wide prose-strong:text-gray-900"
            >
              <style>{`
                .au-industries-content p > a:only-child {
                  display: inline-block;
                  padding: 12px 40px;
                  background-color: #B8860B;
                  color: #fff !important;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  text-decoration: none !important;
                  transition: background-color 0.2s;
                }
                .au-industries-content p > a:only-child:hover {
                  background-color: #9A7209;
                }
              `}</style>
              <MarkdownPreview source={page.content} style={{ backgroundColor: "transparent" }} />
            </div>
          )}
        </div>
      </section>

      <ServiceCaseStudies slug={slug} />

      {SERVICE_FAQS[slug] && SERVICE_FAQS[slug].length > 0 && (
        <section
          id="frequently-asked-questions"
          className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20"
        >
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
              Frequently Asked Questions
            </h2>
            <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-10" />
            <div className="space-y-6">
              {SERVICE_FAQS[slug].map((faq) => (
                <details
                  key={faq.question}
                  className="group bg-white rounded-lg border border-[#B8860B]/20 shadow-sm overflow-hidden"
                >
                  <summary className="cursor-pointer px-6 py-4 font-semibold text-gray-900 flex items-center justify-between hover:bg-[#fdf8e8] transition-colors">
                    <span>{faq.question}</span>
                    <span className="text-[#B8860B] text-2xl ml-4 flex-shrink-0 group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <div className="px-6 pb-5 pt-2 text-gray-700 leading-relaxed border-t border-gray-100">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ServiceCaseStudies(props: { slug: string }) {
  const studies = caseStudiesForService(props.slug)
    .slice()
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, 3);

  if (studies.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16 border-t border-[#B8860B]/20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide">
            Recent Projects
          </h2>
          <Link
            href="/projects"
            className="text-sm font-semibold uppercase tracking-wider text-[#B8860B] hover:text-[#9A7209]"
          >
            All projects →
          </Link>
        </div>
        <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {studies.map((study) => (
            <ServiceCaseStudyCard key={study.slug} study={study} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCaseStudyCard(props: { study: CaseStudy }) {
  const heroPhoto = props.study.photos[0];
  const heroSrc = `/au-industries/gallery/${heroPhoto.src}`;
  return (
    <Link
      href={`/projects/${props.study.slug}`}
      className="group block bg-white rounded-lg overflow-hidden border-2 border-[#B8860B]/20 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="relative h-44">
        <Image
          src={heroSrc}
          alt={heroPhoto.alt}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
      </div>
      <div className="p-4">
        <div className="text-xs uppercase tracking-widest text-[#B8860B] font-semibold mb-1">
          {props.study.dateLabel}
        </div>
        <div className="font-bold text-gray-900 leading-tight text-sm">{props.study.title}</div>
      </div>
    </Link>
  );
}
