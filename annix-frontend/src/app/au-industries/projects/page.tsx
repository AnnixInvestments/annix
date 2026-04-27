import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CASE_STUDIES, type CaseStudy, projectCaseStudies } from "../caseStudies";

const SITE_URL = "https://auind.co.za";

export const metadata: Metadata = {
  title: "Project Case Studies",
  description:
    "Real AU Industries project case studies — rubber lining, ceramic embedded rubber, HDPE piping, and fabricated mining solutions delivered across South Africa, Mozambique, Namibia, and West Africa.",
  alternates: { canonical: `${SITE_URL}/projects` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/projects`,
    title: "Project Case Studies | AU Industries",
    description:
      "Real AU Industries projects across South African and Southern African mining customers — rubber lining, ceramic embedded rubber, HDPE piping, fabricated chutes, and mining solutions.",
  },
};

const COUNTRY_ORDER = ["South Africa", "Mozambique", "Namibia", "West Africa"] as const;

interface CountryGroup {
  country: string;
  studies: CaseStudy[];
}

function groupByCountry(studies: CaseStudy[]): CountryGroup[] {
  const sorted = [...studies].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  const knownGroups: CountryGroup[] = COUNTRY_ORDER.map((country) => ({
    country,
    studies: sorted.filter((study) => study.country === country),
  })).filter((group) => group.studies.length > 0);
  const remaining = sorted.filter(
    (study) =>
      study.country !== null &&
      !COUNTRY_ORDER.includes(study.country as (typeof COUNTRY_ORDER)[number]),
  );
  if (remaining.length > 0) {
    return [...knownGroups, { country: "Other regions", studies: remaining }];
  }
  return knownGroups;
}

function buildJsonLd() {
  const projects = projectCaseStudies();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AU Industries Project Case Studies",
    itemListElement: projects.map((study, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/projects/${study.slug}`,
      name: study.title,
    })),
  };
}

export default function CaseStudiesIndexPage() {
  const groups = groupByCountry(CASE_STUDIES);
  const jsonLd = buildJsonLd();
  const totalProjects = projectCaseStudies().length;

  return (
    <div>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: ItemList JSON-LD must be inline JSON for Google to parse
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section
        className="relative h-56 md:h-72 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/AUI-banner8.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider mb-3">
            Project Case Studies
          </h1>
          <p className="text-[#efcc54] text-base md:text-lg max-w-2xl">
            {totalProjects} delivered customer projects across mining, processing, and industrial
            sites in Southern Africa.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          {groups.map((group) => (
            <CountrySection key={group.country} group={group} />
          ))}
        </div>
      </section>

      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
            Have a project to quote?
          </h2>
          <p className="text-gray-300 mb-8">
            We rubber line, fabricate, and supply HDPE pipework from our Boksburg facility for
            mining and industrial customers across Southern Africa.
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

function CountrySection(props: { group: CountryGroup }) {
  return (
    <div className="mb-16 last:mb-0">
      <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
        {props.group.country}
      </h2>
      <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {props.group.studies.map((study) => (
          <CaseStudyCard key={study.slug} study={study} />
        ))}
      </div>
    </div>
  );
}

function CaseStudyCard(props: { study: CaseStudy }) {
  const heroPhoto = props.study.photos[0];
  const heroSrc = `/au-industries/gallery/${heroPhoto.src}`;
  const industry = props.study.industry;
  const industryLabel = industry || "Showcase";

  return (
    <Link
      href={`/projects/${props.study.slug}`}
      className="group block bg-white rounded-lg overflow-hidden border-2 border-white shadow-md hover:shadow-xl transition-shadow"
    >
      <div className="relative h-56">
        <Image
          src={heroSrc}
          alt={heroPhoto.alt}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute top-3 left-3 bg-[#B8860B] text-white text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded">
          {industryLabel}
        </div>
      </div>
      <div className="p-5">
        <div className="text-xs uppercase tracking-widest text-[#B8860B] font-semibold mb-1">
          {props.study.dateLabel}
          {props.study.location !== null && <span className="mx-2 text-gray-400">·</span>}
          {props.study.location !== null && (
            <span className="text-gray-700 normal-case tracking-normal font-medium">
              {props.study.location}
            </span>
          )}
        </div>
        <div className="font-bold text-gray-900 leading-snug mb-2">{props.study.title}</div>
        <div className="text-sm text-gray-600 line-clamp-2">{props.study.summary}</div>
      </div>
    </Link>
  );
}
