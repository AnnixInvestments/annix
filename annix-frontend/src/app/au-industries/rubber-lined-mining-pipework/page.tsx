import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AU_INDUSTRIES_CONTACT } from "../auIndustriesContact";
import { CASE_STUDIES, type CaseStudy } from "../caseStudies";

const SITE_URL = "https://auind.co.za";
const PATH = "rubber-lined-mining-pipework";
const PAGE_URL = `${SITE_URL}/${PATH}`;

const PAGE_TITLE = "Rubber Lined Mining Pipework — Pipes, Bends & Fittings";
const PAGE_DESCRIPTION =
  "Rubber lined mining pipework from AU Industries — abrasion-resistant rubber lined pipe, bends, spools, and fittings fabricated and lined in Boksburg for slurry duty across Southern African mines.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "Rubber Lined Mining Pipework | AU Industries",
    description: PAGE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/au-industries/gallery/gallery41.jpg`,
        alt: "Rubber lined mining pipework — AU Industries, Boksburg",
      },
    ],
  },
};

const MINING_PIPEWORK_FAQS = [
  {
    question: "What slurry pipework does AU Industries rubber line?",
    answer:
      "We rubber line straight pipe spools, bends, reducers, tees, laterals, and flanged fittings for mining slurry, tailings, and process water service. Pipework is lined in our Boksburg facility and dispatched to mine sites across South Africa, Mozambique, Namibia, Zambia, Botswana, and Zimbabwe.",
  },
  {
    question: "Which rubber compound is best for abrasive mining pipework?",
    answer:
      "40 Shore natural rubber is the workhorse for fine-slurry abrasion in pipes and bends, while 60 Shore handles coarser, impact-loaded streams. For high-silica or sharp-particle duty our premium 60 Shore pink and A38 pink compounds resist cutting where standard rubber chunks. The right lining depends on particle size, velocity, pH, and temperature — we specify it against your slurry profile.",
  },
  {
    question: "How thick is the rubber lining on mining pipes?",
    answer:
      "Lining thickness is matched to the abrasion profile — typically 6mm for general slurry service, increasing in high-wear zones such as bends and reducers where flow changes direction and wear accelerates. We can step thickness up locally rather than over-lining the whole spool.",
  },
  {
    question: "Do you fabricate the pipework as well as line it?",
    answer:
      "Yes. We fabricate carbon steel and HDPE pipe spools, bends, and fittings to your isometrics, then prep, prime, and autoclave-cure the rubber lining in-house. Fabricating and lining under one roof keeps the bond quality controlled and the schedule short.",
  },
  {
    question: "How long does rubber lined slurry pipework last?",
    answer:
      "Properly specified 40 Shore lining typically delivers 12–36 months in slurry pipes depending on slurry type, particle size, velocity, and chemistry. Harder and premium compounds extend life further in heavy-abrasion bends and reducers. Surface preparation to SA 3 standard before lining is the single biggest factor in avoiding premature adhesion failure.",
  },
];

function miningPipeworkStudies(): CaseStudy[] {
  return CASE_STUDIES.filter(
    (study) =>
      study.services.includes("rubber-lining") && study.services.includes("mining-solutions"),
  )
    .slice()
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, 6);
}

function buildJsonLd() {
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Rubber Lined Mining Pipework",
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    provider: {
      "@type": "LocalBusiness",
      name: AU_INDUSTRIES_CONTACT.companyName,
      url: SITE_URL,
      telephone: AU_INDUSTRIES_CONTACT.phone,
      email: AU_INDUSTRIES_CONTACT.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: AU_INDUSTRIES_CONTACT.streetAddress,
        addressLocality: AU_INDUSTRIES_CONTACT.city,
        addressRegion: AU_INDUSTRIES_CONTACT.province,
        postalCode: AU_INDUSTRIES_CONTACT.postalCode,
        addressCountry: "ZA",
      },
    },
    areaServed: [
      { "@type": "Country", name: "South Africa" },
      { "@type": "Country", name: "Mozambique" },
      { "@type": "Country", name: "Namibia" },
      { "@type": "Country", name: "Zambia" },
      { "@type": "Country", name: "Botswana" },
      { "@type": "Country", name: "Zimbabwe" },
    ],
    serviceType: "Rubber lined mining pipework fabrication and lining",
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Rubber Lining",
        item: `${SITE_URL}/rubber-lining`,
      },
      { "@type": "ListItem", position: 3, name: "Mining Pipework", item: PAGE_URL },
    ],
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: MINING_PIPEWORK_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  return [service, breadcrumbs, faqPage];
}

export default function RubberLinedMiningPipeworkPage() {
  const studies = miningPipeworkStudies();
  const jsonLdBlocks = buildJsonLd();

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

      <section className="relative h-64 md:h-80">
        <Image
          src="/au-industries/gallery/gallery02.jpg"
          alt="Rubber lined slurry pipe and fittings for mining at AU Industries Boksburg facility"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <p className="text-[#efcc54] text-sm uppercase tracking-widest mb-3">
            Slurry · Tailings · Process Water
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider leading-tight">
            Rubber Lined Mining Pipework
          </h1>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Abrasion-resistant pipe rubber lining for mining
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            Unlined steel pipework in slurry service erodes fast — bends, reducers, and
            high-velocity runs wear through first, driving unplanned downtime and repeat replacement
            cost. AU Industries rubber lines mining pipework to take that wear in a sacrificial,
            replaceable rubber layer instead of the pipe wall, extending service life across slurry,
            tailings, and process-water lines.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            We fabricate and rubber line pipe spools, bends, reducers, tees, and flanged fittings to
            your isometrics in our Boksburg facility, then prep, prime, and autoclave-cure the
            lining in-house. Fabricating and lining under one roof keeps bond quality controlled and
            the schedule short — and lets us step lining thickness up locally in the bends and
            reducers where slurry wear accelerates.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrustBadge title="SA 3 prep" subtitle="Grit blasted before lining" />
            <TrustBadge title="Autoclave cured" subtitle="Inspected before dispatch" />
            <TrustBadge title="Boksburg facility" subtitle="Fabricate + line in-house" />
          </div>
        </div>
      </section>

      <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            What we line for mining pipework
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
            <BulletPoint>Straight pipe spools — carbon steel and HDPE</BulletPoint>
            <BulletPoint>Bends, elbows, and long-radius sweeps</BulletPoint>
            <BulletPoint>Reducers, tees, laterals, and Y-pieces</BulletPoint>
            <BulletPoint>Flanged fittings and pump connection pieces</BulletPoint>
            <BulletPoint>Cyclone feed and underflow pipework</BulletPoint>
            <BulletPoint>Tailings and process-water lines</BulletPoint>
          </div>

          <h3 className="text-xl font-bold text-[#B8860B] uppercase tracking-wide mt-12 mb-2">
            Choosing the lining compound
          </h3>
          <div className="w-16 h-[3px] bg-[#B8860B] mb-6" />
          <ul className="space-y-3 text-gray-700">
            <BulletPoint>
              <strong>40 Shore natural rubber</strong> — the workhorse for fine-slurry abrasion in
              pipes and bends.
            </BulletPoint>
            <BulletPoint>
              <strong>60 Shore natural rubber</strong> — for coarser, impact-loaded slurry where
              larger particles cut and gouge.
            </BulletPoint>
            <BulletPoint>
              <strong>Premium 60 Shore pink &amp; A38 pink</strong> — high-silica, cut-resistant
              compounds for sharp-particle duty that chunks standard rubber.
            </BulletPoint>
            <BulletPoint>
              <strong>Bromobutyl &amp; nitrile</strong> — where acid, chemical, or oil exposure is
              the failure mode rather than abrasion. Custom compounds developed on request.
            </BulletPoint>
          </ul>
        </div>
      </section>

      {studies.length > 0 && (
        <section className="bg-white py-16 border-t border-[#B8860B]/20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
              <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide">
                Mining pipework projects
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
                <CaseCard key={study.slug} study={study} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        id="frequently-asked-questions"
        className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20"
      >
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Frequently Asked Questions
          </h2>
          <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-10" />
          <div className="space-y-6">
            {MINING_PIPEWORK_FAQS.map((faq) => (
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

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/rubber-lining"
              className="inline-block px-8 py-3 border-2 border-[#8A6608] text-[#8A6608] font-semibold uppercase tracking-wider hover:bg-[#8A6608] hover:text-white transition-colors text-center"
            >
              Full rubber lining details
            </Link>
            <Link
              href="/quote"
              className="inline-block px-8 py-3 bg-[#8A6608] text-white font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors text-center"
            >
              Request a quote
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
            Rubber lining slurry pipework from our Boksburg facility
          </h2>
          <p className="text-gray-300 mb-2">{AU_INDUSTRIES_CONTACT.address}</p>
          <p className="text-gray-300 mb-8">
            Send us your isometrics or fitting schedule — call {AU_INDUSTRIES_CONTACT.phone} or
            email {AU_INDUSTRIES_CONTACT.email}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/quote"
              className="inline-block px-10 py-4 bg-[#8A6608] text-white font-semibold uppercase tracking-wider hover:bg-[#6E5106] transition-colors"
            >
              Get a quote
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

function TrustBadge(props: { title: string; subtitle: string }) {
  return (
    <div className="border border-[#B8860B]/30 rounded-lg p-4 text-center">
      <div className="text-lg font-bold text-[#B8860B] uppercase">{props.title}</div>
      <div className="text-sm text-gray-600 mt-1">{props.subtitle}</div>
    </div>
  );
}

function BulletPoint(props: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#B8860B] mt-2.5" />
      <span className="text-gray-700 leading-relaxed">{props.children}</span>
    </li>
  );
}

function CaseCard(props: { study: CaseStudy }) {
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
