import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AU_INDUSTRIES_CONTACT } from "../auIndustriesContact";
import { CASE_STUDIES, type CaseStudy } from "../caseStudies";

const SITE_URL = "https://auind.co.za";
const PATH = "industrial-wear-lining";
const PAGE_URL = `${SITE_URL}/${PATH}`;

const PAGE_TITLE = "Industrial Wear Lining Solutions South Africa | AU Industries";
const PAGE_DESCRIPTION =
  "Industrial linings and wear lining solutions from AU Industries — abrasion- and corrosion-resistant rubber linings, ceramic-embedded wear panels, and lined pipework fabricated in Boksburg for mining and industrial plant across South Africa.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "Industrial Wear Lining Solutions | AU Industries",
    description: PAGE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/au-industries/gallery/gallery22.jpg`,
        alt: "Industrial wear lining — ceramic embedded rubber panels, AU Industries",
      },
    ],
  },
};

const WEAR_LINING_FAQS = [
  {
    question: "What industrial linings does AU Industries supply?",
    answer:
      "We supply rubber linings (40 and 60 Shore natural rubber, premium 60 Shore pink and A38 pink, bromobutyl, and nitrile), ceramic-embedded rubber wear panels, and rubber lined pipework and fittings. Linings are applied to tanks, pipes, chutes, hoppers, cyclones, screen decks, and pulley lagging, and fabricated or lined in our Boksburg facility.",
  },
  {
    question: "How do I choose between rubber and ceramic wear lining?",
    answer:
      "Rubber lining handles fine to medium slurry abrasion and absorbs impact through resilience — it's the right choice for most pipes, tanks, and cyclones. Ceramic-embedded panels are specified for the most severe sliding-abrasion and high-impact zones such as transfer points, chute liners, and crusher discharge, where the hard ceramic resists gouging that would cut through rubber alone. We assess particle size, velocity, and impact angle before recommending.",
  },
  {
    question: "What surfaces and equipment can be wear lined?",
    answer:
      "Tanks and vessels, slurry pipework and fittings, transfer chutes and hoppers, cyclone feeds, screen decks, pump housings, and pulley lagging. If a steel surface is eroding in service, it can usually be protected with a lining matched to the wear mechanism.",
  },
  {
    question: "Do you line on-site or in your workshop?",
    answer:
      "Both. Smaller and fabricated items are lined in our Boksburg workshop under controlled autoclave cure; large fixed plant is lined on-site with grit blasting to SA 3 standard, bonded application, and spark testing. We provide on-site lining across South Africa, Mozambique, Namibia, Zambia, Botswana, and Zimbabwe.",
  },
  {
    question: "How long do industrial wear linings last?",
    answer:
      "Service life depends on the wear mechanism, particle size, velocity, and chemistry. Properly specified 40 Shore rubber typically delivers 12–36 months in slurry service; premium and ceramic-backed linings extend that further in severe-wear zones. Surface preparation to SA 3 standard before lining is the single biggest factor in avoiding premature adhesion failure.",
  },
];

function wearLiningStudies(): CaseStudy[] {
  return CASE_STUDIES.filter((study) => study.services.includes("rubber-lining"))
    .slice()
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, 6);
}

function buildJsonLd() {
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Industrial Wear Lining",
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
    serviceType: "Industrial wear lining — rubber and ceramic-backed",
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
      { "@type": "ListItem", position: 3, name: "Industrial Wear Lining", item: PAGE_URL },
    ],
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: WEAR_LINING_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  return [service, breadcrumbs, faqPage];
}

export default function IndustrialWearLiningPage() {
  const studies = wearLiningStudies();
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
          src="/au-industries/gallery/gallery12.jpg"
          alt="Industrial wear lining — rubber lined and ceramic-backed components at AU Industries Boksburg"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <p className="text-[#efcc54] text-sm uppercase tracking-widest mb-3">
            Mining · Minerals Processing · Heavy Industry
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider leading-tight">
            Industrial Wear Lining
          </h1>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Industrial linings that take the wear so your plant doesn't
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            Abrasion, impact, and corrosion are the fastest way to wear out unlined steel plant —
            slurry pipes, tanks, chutes, and screen decks all erode in service, driving repeat
            replacement cost and unplanned downtime. AU Industries supplies industrial wear lining
            solutions that move that wear into a replaceable lining instead of the equipment itself,
            extending service life across mining, minerals processing, and heavy industry.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            We line in-house and on-site, matching the lining to the wear mechanism — resilient
            rubber for slurry abrasion, harder and premium compounds for impact and cutting duty,
            and ceramic-embedded panels for the most severe transfer-point and chute service. Every
            surface is prepared to SA 3 standard before lining, the single biggest factor in
            long-term adhesion.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrustBadge title="Rubber + ceramic" subtitle="Matched to the wear mechanism" />
            <TrustBadge title="SA 3 prep" subtitle="Grit blasted before lining" />
            <TrustBadge title="In-house compounding" subtitle="Custom chemistry & hardness" />
          </div>
        </div>
      </section>

      <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Wear lining solutions we supply
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
            <BulletPoint>Rubber lined tanks, vessels, and launders</BulletPoint>
            <BulletPoint>Rubber lined slurry pipework, bends, and fittings</BulletPoint>
            <BulletPoint>Transfer chutes, hoppers, and chute liners</BulletPoint>
            <BulletPoint>Ceramic-embedded rubber wear panels</BulletPoint>
            <BulletPoint>Cyclone, screen-deck, and pump-housing lining</BulletPoint>
            <BulletPoint>Pulley lagging and conveyor wear components</BulletPoint>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/rubber-lining"
              className="inline-block px-8 py-3 border-2 border-[#8A6608] text-[#8A6608] font-semibold uppercase tracking-wider hover:bg-[#8A6608] hover:text-white transition-colors text-center"
            >
              Rubber lining detail
            </Link>
            <Link
              href="/rubber-lined-mining-pipework"
              className="inline-block px-8 py-3 border-2 border-[#8A6608] text-[#8A6608] font-semibold uppercase tracking-wider hover:bg-[#8A6608] hover:text-white transition-colors text-center"
            >
              Mining pipework
            </Link>
          </div>
        </div>
      </section>

      {studies.length > 0 && (
        <section className="bg-white py-16 border-t border-[#B8860B]/20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
              <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide">
                Wear lining projects
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
            {WEAR_LINING_FAQS.map((faq) => (
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

      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
            Wear lining quoted from our Boksburg facility
          </h2>
          <p className="text-gray-300 mb-2">{AU_INDUSTRIES_CONTACT.address}</p>
          <p className="text-gray-300 mb-8">
            Tell us what's wearing out — call {AU_INDUSTRIES_CONTACT.phone} or email{" "}
            {AU_INDUSTRIES_CONTACT.email}.
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
