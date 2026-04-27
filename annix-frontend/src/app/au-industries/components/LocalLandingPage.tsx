import Image from "next/image";
import Link from "next/link";
import { AU_INDUSTRIES_CONTACT } from "../auIndustriesContact";
import { CASE_STUDIES, type CaseStudy } from "../caseStudies";

const SITE_URL = "https://auind.co.za";

export interface LocalLandingProps {
  pathSlug: string;
  serviceSlug: string;
  serviceName: string;
  serviceDescription: string;
  suburb: string;
  region: string;
  suburbContext: string;
  pageTitle: string;
  pageDescription: string;
  caseStudyCountry: string;
  heroImageSrc: string;
  heroImageAlt: string;
}

function buildJsonLd(props: LocalLandingProps) {
  const url = `${SITE_URL}/${props.pathSlug}`;
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${props.serviceName} — ${props.suburb}`,
    description: props.pageDescription,
    url,
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
    areaServed: {
      "@type": "City",
      name: props.suburb,
      containedInPlace: { "@type": "AdministrativeArea", name: props.region },
    },
    serviceType: props.serviceName,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: props.serviceName,
        item: `${SITE_URL}/${props.serviceSlug}`,
      },
      { "@type": "ListItem", position: 3, name: props.suburb, item: url },
    ],
  };
  return [service, breadcrumbs];
}

function nearbyCaseStudies(serviceSlug: string, country: string): CaseStudy[] {
  return CASE_STUDIES.filter(
    (study) => study.country === country && study.services.includes(serviceSlug),
  )
    .slice()
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, 3);
}

export function LocalLandingPage(props: LocalLandingProps) {
  const studies = nearbyCaseStudies(props.serviceSlug, props.caseStudyCountry);
  const jsonLdBlocks = buildJsonLd(props);

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
          src={props.heroImageSrc}
          alt={props.heroImageAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <p className="text-[#efcc54] text-sm uppercase tracking-widest mb-3">
            Service area: {props.region}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider leading-tight">
            {props.serviceName} in {props.suburb}
          </h1>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Local {props.serviceName.toLowerCase()} for {props.suburb} customers
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <p className="text-gray-700 text-lg leading-relaxed mb-6">{props.suburbContext}</p>
          <p className="text-gray-700 text-lg leading-relaxed">{props.serviceDescription}</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrustBadge title="BEE Level 4" subtitle="100% procurement recognition" />
            <TrustBadge title="40+ years experience" subtitle="Combined team experience" />
            <TrustBadge title="Boksburg facility" subtitle="Fast turnaround across Gauteng" />
          </div>
        </div>
      </section>

      {studies.length > 0 && (
        <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
              Recent {props.region} projects
            </h2>
            <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {studies.map((study) => (
                <NearbyCaseCard key={study.slug} study={study} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Why customers near {props.suburb} choose AU Industries
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <ul className="space-y-3 text-gray-700">
            <BulletPoint>
              Boksburg-based fabrication facility with same-day quoting and fast collection or
              delivery across Gauteng.
            </BulletPoint>
            <BulletPoint>
              Track record of delivered {props.serviceName.toLowerCase()} projects across mining and
              industrial customers in {props.region} and the broader region.
            </BulletPoint>
            <BulletPoint>
              In-house compounding lets us match customer-specific chemistry, hardness, and wear
              profiles when off-the-shelf compounds don't fit.
            </BulletPoint>
            <BulletPoint>
              BEE Level 4 certified — 100% B-BBEE procurement recognition for your supply scorecard.
            </BulletPoint>
          </ul>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href={`/${props.serviceSlug}`}
              className="inline-block px-8 py-3 border-2 border-[#B8860B] text-[#B8860B] font-semibold uppercase tracking-wider hover:bg-[#B8860B] hover:text-white transition-colors text-center"
            >
              Full {props.serviceName} details
            </Link>
            <Link
              href="/quote"
              className="inline-block px-8 py-3 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors text-center"
            >
              Request a quote
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
            Quoting {props.suburb} customers from our Boksburg facility
          </h2>
          <p className="text-gray-300 mb-2">{AU_INDUSTRIES_CONTACT.address}</p>
          <p className="text-gray-300 mb-8">
            Call {AU_INDUSTRIES_CONTACT.phone} or email {AU_INDUSTRIES_CONTACT.email}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/quote"
              className="inline-block px-10 py-4 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
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

function NearbyCaseCard(props: { study: CaseStudy }) {
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
        <div className="font-bold text-gray-900 leading-tight text-sm">{props.study.title}</div>
      </div>
    </Link>
  );
}
