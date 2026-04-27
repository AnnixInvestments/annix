import type { Metadata } from "next";
import Link from "next/link";
import { GENERAL_FAQS } from "../generalFaqs";
import { SERVICE_FAQS } from "../serviceFaqs";

export const metadata: Metadata = {
  title: "FAQ — Rubber Lining, Sheeting, Compound, HDPE & Mining Solutions",
  description:
    "Frequently asked questions about AU Industries' rubber lining, sheeting, compound, HDPE piping, conveyor components, mining solutions, site maintenance, and rubber roll services. Quotes, payment terms, delivery, warranties.",
  alternates: {
    canonical: "https://auind.co.za/faq",
  },
};

const SERVICE_PAGES: { slug: string; title: string }[] = [
  { slug: "rubber-lining", title: "Rubber Lining" },
  { slug: "rubber-sheeting", title: "Rubber Sheeting" },
  { slug: "rubber-compound", title: "Rubber Compound" },
  { slug: "hdpe-piping", title: "HDPE Piping" },
  { slug: "mining-solutions", title: "Mining Solutions" },
  { slug: "conveyor-components", title: "Conveyor Components" },
  { slug: "site-maintenance", title: "Site Maintenance & Installation" },
  { slug: "rubber-rolls", title: "Rubber Rolls" },
];

export default function AuIndustriesFaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GENERAL_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: FAQPage JSON-LD must be inline JSON for Google to parse
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="bg-[#fdf8e8] py-20">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#B8860B] uppercase tracking-wider">
            Frequently Asked Questions
          </h1>
          <div className="w-24 h-[3px] bg-[#B8860B] mt-3 mb-10" />
          <p className="text-black text-lg leading-relaxed mb-10">
            General questions about AU Industries — quotes, payment terms, delivery, warranties, and
            account opening. For service-specific questions (rubber lining hardness, HDPE sizes,
            lead times etc.) see the FAQ section at the bottom of each service page.
          </p>

          <div className="space-y-4">
            {GENERAL_FAQS.map((faq) => (
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

      <section className="bg-white py-16 border-t border-[#B8860B]/20">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#B8860B] uppercase tracking-wider mb-2">
            Service-specific FAQs
          </h2>
          <div className="w-20 h-[3px] bg-[#B8860B] mt-3 mb-8" />
          <p className="text-gray-700 mb-8">
            Each service page has its own FAQ section answering technical questions about that
            specific product or service.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICE_PAGES.map((page) => {
              const faqs = SERVICE_FAQS[page.slug];
              const count = faqs ? faqs.length : 0;
              return (
                <Link
                  key={page.slug}
                  href={`/${page.slug}#frequently-asked-questions`}
                  className="flex items-center justify-between px-5 py-4 bg-[#fdf8e8] border border-[#B8860B]/20 rounded-lg hover:bg-[#B8860B] hover:text-white hover:border-[#B8860B] transition-colors group"
                >
                  <span className="font-semibold">{page.title}</span>
                  <span className="text-sm text-[#B8860B] group-hover:text-white">
                    {count} questions →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#efcc54] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-black mb-4">
            Question not answered here?
          </h2>
          <p className="text-black mb-8">
            Get in touch and we'll come back to you within 24 hours.
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 bg-[#B8860B] text-white text-lg font-semibold uppercase tracking-wider hover:bg-[#9A7209] transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
