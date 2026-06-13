import type { CaseStudyStripBlock, CmsBlock } from "@annix/product-data/cms";
import { isArray } from "es-toolkit/compat";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlockRenderer } from "@/app/lib/cms/render/BlockRenderer";
import { faqJsonLdFromBlocks } from "@/app/lib/cms/render/jsonLd";
import { type CaseStudy, caseStudiesForService } from "../caseStudies";
import { SERVICE_FAQS } from "../serviceFaqs";
import { ServicePageBody } from "./ServicePageBody";

interface ServicePageDto {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  content: string;
  heroImageUrl: string | null;
  useBlocks?: boolean;
  publishedBlocks?: CmsBlock[] | null;
}

interface RelatedSolution {
  href: string;
  title: string;
  description: string;
}

const RELATED_SOLUTIONS: Record<string, RelatedSolution[]> = {
  "rubber-lining": [
    {
      href: "/rubber-lined-mining-pipework",
      title: "Rubber Lined Mining Pipework",
      description: "Abrasion-resistant rubber lined pipe, bends, and fittings for slurry duty.",
    },
    {
      href: "/industrial-wear-lining",
      title: "Industrial Wear Lining",
      description: "Rubber and ceramic-backed wear lining for mining and heavy industry.",
    },
  ],
  "mining-solutions": [
    {
      href: "/rubber-lined-mining-pipework",
      title: "Rubber Lined Mining Pipework",
      description: "Fabricated and lined slurry pipework, bends, and fittings from Boksburg.",
    },
    {
      href: "/industrial-wear-lining",
      title: "Industrial Wear Lining",
      description: "Wear lining matched to the abrasion, impact, or corrosion mechanism.",
    },
  ],
  "rubber-sheeting": [
    {
      href: "/industrial-wear-lining",
      title: "Industrial Wear Lining",
      description: "Rubber and ceramic-backed wear lining for plant and equipment.",
    },
  ],
  "conveyor-components": [
    {
      href: "/industrial-wear-lining",
      title: "Industrial Wear Lining",
      description: "Wear lining and pulley lagging for conveyor and transfer-point service.",
    },
  ],
};

async function fetchPage(slug: string): Promise<ServicePageDto | null> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];
  if (host.length === 0) {
    return null;
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const apiBase = `${protocol}://${host}/api`;
  try {
    const res = await fetch(`${apiBase}/public/au-industries/pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AuIndustriesSlugPage(props: PageProps) {
  const { slug } = await props.params;
  const page = await fetchPage(slug);

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-500">The page you are looking for does not exist.</p>
      </div>
    );
  }

  const heroImageUrl = page.heroImageUrl;
  const publishedBlocks = page.publishedBlocks;
  const blocksMode =
    page.useBlocks === true && isArray(publishedBlocks) && publishedBlocks.length > 0;

  if (blocksMode && publishedBlocks) {
    const faqJsonLd = faqJsonLdFromBlocks(publishedBlocks);
    return (
      <div>
        {faqJsonLd && (
          <script
            type="application/ld+json"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline JSON for Google to parse
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        )}
        {heroImageUrl && (
          <div className="relative h-64 md:h-80">
            <Image
              src={heroImageUrl}
              alt={page.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative max-w-4xl mx-auto px-4 h-full flex items-center justify-center">
              <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider text-center">
                {page.title}
              </h1>
            </div>
          </div>
        )}
        <BlockRenderer
          blocks={publishedBlocks}
          customRenderers={{
            caseStudyStrip: (block) => (
              <CaseStudyStripView block={block as CaseStudyStripBlock} fallbackSlug={slug} />
            ),
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {heroImageUrl && (
        <div className="relative h-64 md:h-80">
          <Image
            src={heroImageUrl}
            alt={page.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
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
          {!heroImageUrl && (
            <h1 className="text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-8 pb-4 border-b-2 border-[#B8860B]">
              {page.title}
            </h1>
          )}

          <ServicePageBody pageId={page.id} initialContent={page.content}>
            <div
              data-color-mode="light"
              className="au-industries-content prose prose-lg max-w-none prose-headings:text-[#B8860B] prose-headings:uppercase prose-headings:tracking-wide prose-strong:text-gray-900"
            >
              <style>{`
                .au-industries-content p > a:only-child {
                  display: inline-block;
                  padding: 12px 40px;
                  background-color: #8A6608;
                  color: #fff !important;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  text-decoration: none !important;
                  transition: background-color 0.2s;
                }
                .au-industries-content p > a:only-child:hover {
                  background-color: #6E5106;
                }
              `}</style>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
            </div>
          </ServicePageBody>
        </div>
      </section>

      <RelatedSolutions slug={slug} />

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

function RelatedSolutions(props: { slug: string }) {
  const solutions = RELATED_SOLUTIONS[props.slug];
  if (!solutions || solutions.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
          Related Solutions
        </h2>
        <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {solutions.map((solution) => (
            <Link
              key={solution.href}
              href={solution.href}
              className="group block bg-white rounded-lg border-2 border-[#B8860B]/20 shadow-sm hover:shadow-lg transition-shadow p-6"
            >
              <div className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-[#B8860B] transition-colors">
                {solution.title}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{solution.description}</p>
              <span className="inline-block mt-3 text-sm font-semibold uppercase tracking-wider text-[#8A6608]">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
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
            className="text-sm font-semibold uppercase tracking-wider text-[#8A6608] hover:text-[#9A7209]"
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
        <div className="text-xs uppercase tracking-widest text-[#8A6608] font-semibold mb-1">
          {props.study.dateLabel}
        </div>
        <div className="font-bold text-gray-900 leading-tight text-sm">{props.study.title}</div>
      </div>
    </Link>
  );
}

function CaseStudyStripView(props: { block: CaseStudyStripBlock; fallbackSlug: string }) {
  const configuredSlug = props.block.serviceSlug;
  const serviceSlug = configuredSlug || props.fallbackSlug;
  const limit = props.block.limit > 0 ? props.block.limit : 3;
  const studies = caseStudiesForService(serviceSlug)
    .slice()
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, limit);

  if (studies.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16 border-t border-[#B8860B]/20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide">
            {props.block.heading}
          </h2>
          <Link
            href="/projects"
            className="text-sm font-semibold uppercase tracking-wider text-[#8A6608] hover:text-[#9A7209]"
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
