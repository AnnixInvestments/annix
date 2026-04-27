import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

const SITE_URL = "https://auind.co.za";
const GOOGLE_REVIEW_URL = "https://www.google.com/maps?cid=7279509968095619778";
const ELFSIGHT_WIDGET_CLASS = "elfsight-app-4c13c174-7edd-4de9-b428-dc35d38ec263";

interface PublicTestimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  rating: number;
  body: string;
  datePublished: string;
  source: string;
  highlight: boolean;
}

export const metadata: Metadata = {
  title: "Testimonials & Customer Reviews",
  description:
    "Customer reviews and testimonials for AU Industries — rubber lining, ceramic embedded rubber, HDPE piping, and mining solutions delivered across Southern Africa.",
  alternates: { canonical: `${SITE_URL}/testimonials` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/testimonials`,
    title: "Testimonials & Customer Reviews | AU Industries",
    description:
      "Reviews and testimonials from AU Industries customers across mining, processing, and industrial sectors in Southern Africa.",
  },
};

async function fetchTestimonials(): Promise<PublicTestimonial[]> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];
  if (host.length === 0) {
    return [];
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const apiBase = `${protocol}://${host}/api`;
  try {
    const res = await fetch(`${apiBase}/public/au-industries/testimonials`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  } catch {
    return [];
  }
}

function aggregateRating(entries: PublicTestimonial[]): { value: number; count: number } | null {
  if (entries.length === 0) {
    return null;
  }
  const total = entries.reduce((sum, entry) => sum + entry.rating, 0);
  const value = Math.round((total / entries.length) * 10) / 10;
  return { value, count: entries.length };
}

function buildReviewJsonLd(entries: PublicTestimonial[]) {
  if (entries.length === 0) {
    return null;
  }
  const aggregate = aggregateRating(entries);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: "AU Industries",
    url: SITE_URL,
    aggregateRating: aggregate
      ? {
          "@type": "AggregateRating",
          ratingValue: aggregate.value,
          reviewCount: aggregate.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    review: entries.map((entry) => ({
      "@type": "Review",
      author: { "@type": "Person", name: entry.authorName },
      reviewBody: entry.body,
      datePublished: entry.datePublished,
      reviewRating: {
        "@type": "Rating",
        ratingValue: entry.rating,
        bestRating: 5,
        worstRating: 1,
      },
    })),
  };
}

export default async function TestimonialsPage() {
  const testimonials = await fetchTestimonials();
  const jsonLd = buildReviewJsonLd(testimonials);
  const aggregate = aggregateRating(testimonials);
  const hasTestimonials = testimonials.length > 0;

  return (
    <div>
      {jsonLd !== null && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Review JSON-LD must be inline JSON for Google to parse
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <section
        className="relative h-56 md:h-72 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url(/au-industries/AUI-banner3.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider mb-3">
            Testimonials
          </h1>
          <p className="text-[#efcc54] text-base md:text-lg max-w-2xl">
            What our customers say about working with AU Industries
          </p>
          {aggregate !== null && (
            <div className="mt-4 flex items-center gap-2 text-white">
              <StarRow rating={aggregate.value} />
              <span className="text-sm">
                {aggregate.value} from {aggregate.count}{" "}
                {aggregate.count === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </div>
      </section>

      {hasTestimonials && (
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
              Customer reviews
            </h2>
            <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((entry) => (
                <TestimonialCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#fdf8e8] py-16 border-t border-[#B8860B]/20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wide mb-2">
            Live Google reviews
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mb-8" />
          <p className="text-gray-700 mb-8">
            Verified reviews from our Google Business Profile, updated automatically.
          </p>
          <div className={ELFSIGHT_WIDGET_CLASS} data-elfsight-app-lazy />
        </div>
      </section>

      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
            Worked with us?
          </h2>
          <p className="text-gray-300 mb-8">
            Leaving a Google review takes a minute and helps other mining and industrial customers
            find us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-10 py-4 bg-[#B8860B] text-white font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
            >
              Leave a Google review
            </a>
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

function TestimonialCard(props: { entry: PublicTestimonial }) {
  const role = props.entry.authorRole;
  const company = props.entry.authorCompany;
  const subtitleParts = [role, company].filter((part) => part !== null);
  const subtitle = subtitleParts.join(" · ");

  return (
    <article className="bg-white rounded-lg border border-[#B8860B]/20 shadow-sm p-6 flex flex-col">
      <StarRow rating={props.entry.rating} />
      <blockquote className="text-gray-700 leading-relaxed mt-4 mb-6 flex-1">
        “{props.entry.body}”
      </blockquote>
      <footer>
        <div className="font-bold text-gray-900">{props.entry.authorName}</div>
        {subtitle.length > 0 && <div className="text-sm text-gray-500">{subtitle}</div>}
      </footer>
    </article>
  );
}

function StarRow(props: { rating: number }) {
  const filled = Math.round(props.rating);
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-1" aria-label={`${props.rating} out of 5 stars`}>
      {stars.map((position) => {
        const isFilled = position <= filled;
        return (
          <svg
            key={position}
            className={`w-5 h-5 ${isFilled ? "text-[#efcc54]" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.287 3.957c.299.921-.756 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.783.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
          </svg>
        );
      })}
    </div>
  );
}
