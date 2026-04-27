import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASE_STUDIES, CASE_STUDY_BY_SLUG, type CaseStudy } from "../../caseStudies";

const SITE_URL = "https://auind.co.za";

const SERVICE_LABELS: Record<string, string> = {
  "rubber-lining": "Rubber Lining",
  "rubber-sheeting": "Rubber Sheeting",
  "rubber-compound": "Rubber Compound",
  "hdpe-piping": "HDPE Piping",
  "mining-solutions": "Mining Solutions",
  "conveyor-components": "Conveyor Components",
  "site-maintenance": "Site Maintenance",
  "rubber-rolls": "Rubber Rolls",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CASE_STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const study = CASE_STUDY_BY_SLUG[slug];
  if (!study) {
    return { title: "Project Not Found" };
  }
  const canonical = `${SITE_URL}/projects/${study.slug}`;
  const heroPhoto = study.photos[0];
  const heroSrc = heroPhoto ? `${SITE_URL}/au-industries/gallery/${heroPhoto.src}` : undefined;
  return {
    title: study.metaTitle,
    description: study.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: study.metaTitle,
      description: study.metaDescription,
      images: heroSrc ? [{ url: heroSrc, alt: heroPhoto.alt }] : [],
    },
  };
}

function relatedStudies(study: CaseStudy): CaseStudy[] {
  const sameCountry = CASE_STUDIES.filter(
    (other) => other.slug !== study.slug && other.country === study.country,
  );
  const sameIndustry = CASE_STUDIES.filter(
    (other) =>
      other.slug !== study.slug &&
      other.industry !== null &&
      other.industry === study.industry &&
      !sameCountry.some((c) => c.slug === other.slug),
  );
  const merged = [...sameCountry, ...sameIndustry];
  return merged.slice(0, 3);
}

function buildJsonLd(study: CaseStudy) {
  const url = `${SITE_URL}/projects/${study.slug}`;
  const photoUrls = study.photos.map((photo) => `${SITE_URL}/au-industries/gallery/${photo.src}`);
  const creativeWork = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: study.title,
    headline: study.metaTitle,
    description: study.metaDescription,
    abstract: study.summary,
    url,
    image: photoUrls,
    datePublished: study.dateISO,
    inLanguage: "en-ZA",
    locationCreated:
      study.location !== null
        ? {
            "@type": "Place",
            name: study.location,
            address: { "@type": "PostalAddress", addressCountry: study.country },
          }
        : undefined,
    about: study.industry,
    keywords: [...study.materials, ...(study.industry !== null ? [study.industry] : [])].join(", "),
    creator: {
      "@type": "Organization",
      name: "AU Industries",
      url: SITE_URL,
    },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE_URL}/projects` },
      { "@type": "ListItem", position: 3, name: study.title, item: url },
    ],
  };
  return [creativeWork, breadcrumbs];
}

export default async function CaseStudyDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const study = CASE_STUDY_BY_SLUG[slug];
  if (!study) {
    notFound();
  }
  const heroPhoto = study.photos[0];
  const heroSrc = `/au-industries/gallery/${heroPhoto.src}`;
  const related = relatedStudies(study);
  const jsonLdBlocks = buildJsonLd(study);
  const hasNarrative = study.problem !== null && study.solution !== null;

  return (
    <div>
      {jsonLdBlocks.map((block) => (
        <script
          key={block["@type"]}
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline JSON for Google to parse
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}

      <section className="relative h-64 md:h-96 bg-cover bg-center">
        <Image
          src={heroSrc}
          alt={heroPhoto.alt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-5xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <p className="text-[#efcc54] text-sm md:text-base uppercase tracking-widest mb-3">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>
            <span className="mx-2">/</span>
            <span>{study.dateLabel}</span>
          </p>
          <h1 className="text-2xl md:text-4xl font-bold text-white uppercase tracking-wider leading-tight">
            {study.title}
          </h1>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <FactCard label="Date" value={study.dateLabel} />
            <FactCard label="Location" value={study.location} />
            <FactCard label="Industry" value={study.industry} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <FactList label="Materials" items={study.materials} />
            <FactList
              label="Services"
              items={study.services.map((slugKey) => {
                const label = SERVICE_LABELS[slugKey];
                return label || slugKey;
              })}
              linkSlugs={study.services}
            />
          </div>

          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-gray-700 text-lg leading-relaxed">{study.summary}</p>
          </div>

          {hasNarrative && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <div className="bg-[#fdf8e8] border border-[#B8860B]/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-[#B8860B] uppercase tracking-wide mb-3">
                  The challenge
                </h2>
                <div className="w-16 h-[3px] bg-[#B8860B] mb-4" />
                <p className="text-gray-700 leading-relaxed">{study.problem}</p>
              </div>
              <div className="bg-[#fdf8e8] border border-[#B8860B]/20 rounded-lg p-6">
                <h2 className="text-xl font-bold text-[#B8860B] uppercase tracking-wide mb-3">
                  Our solution
                </h2>
                <div className="w-16 h-[3px] bg-[#B8860B] mb-4" />
                <p className="text-gray-700 leading-relaxed">{study.solution}</p>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Project photos
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {study.photos.map((photo) => (
              <div
                key={photo.src}
                className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-white shadow-md"
              >
                <Image
                  src={`/au-industries/gallery/${photo.src}`}
                  alt={photo.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
              Related projects
            </h2>
            <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((other) => (
                <RelatedCard key={other.slug} study={other} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
            Have a similar project?
          </h2>
          <p className="text-gray-300 mb-8">
            Tell us about your application — we'll quote rubber lining, HDPE, or fabricated
            solutions from our Boksburg facility.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/quote"
              className="inline-block px-10 py-4 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
            >
              Request a quote
            </Link>
            <Link
              href="/contact"
              className="inline-block px-10 py-4 border-2 border-white text-white font-semibold uppercase tracking-wider hover:bg-white hover:text-gray-900 transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FactCard(props: { label: string; value: string | null }) {
  const value = props.value;
  const display = value || "—";
  return (
    <div className="border border-[#B8860B]/30 rounded-lg p-4">
      <div className="text-xs uppercase tracking-widest text-[#B8860B] font-semibold mb-1">
        {props.label}
      </div>
      <div className="text-base font-semibold text-gray-900">{display}</div>
    </div>
  );
}

function FactList(props: { label: string; items: string[]; linkSlugs?: string[] }) {
  const fromProps = props.linkSlugs;
  const linkSlugs = fromProps || [];
  return (
    <div className="border border-[#B8860B]/30 rounded-lg p-4">
      <div className="text-xs uppercase tracking-widest text-[#B8860B] font-semibold mb-2">
        {props.label}
      </div>
      <ul className="space-y-1">
        {props.items.map((item, idx) => {
          const linkTarget = linkSlugs[idx];
          if (linkTarget) {
            return (
              <li key={item}>
                <Link
                  href={`/${linkTarget}`}
                  className="text-gray-900 hover:text-[#B8860B] font-medium underline-offset-2 hover:underline"
                >
                  {item}
                </Link>
              </li>
            );
          }
          return (
            <li key={item} className="text-gray-900 font-medium">
              {item}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RelatedCard(props: { study: CaseStudy }) {
  const heroPhoto = props.study.photos[0];
  const heroSrc = `/au-industries/gallery/${heroPhoto.src}`;
  return (
    <Link
      href={`/projects/${props.study.slug}`}
      className="block bg-white rounded-lg overflow-hidden border-2 border-white shadow-md hover:shadow-xl transition-shadow"
    >
      <div className="relative h-44">
        <Image
          src={heroSrc}
          alt={heroPhoto.alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-4">
        <div className="text-xs uppercase tracking-widest text-[#B8860B] font-semibold mb-1">
          {props.study.dateLabel}
        </div>
        <div className="font-bold text-gray-900 leading-tight">{props.study.title}</div>
      </div>
    </Link>
  );
}
