import type { Metadata } from "next";
import { headers } from "next/headers";
import { SERVICE_FAQS } from "../serviceFaqs";

const SITE_URL = "https://auind.co.za";

interface WebsitePageDto {
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

async function fetchPage(slug: string): Promise<WebsitePageDto | null> {
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

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await fetchPage(slug);
  const canonical = `${SITE_URL}/${slug}`;

  if (!page) {
    return { alternates: { canonical } };
  }

  const { metaTitle, metaDescription, title: pageTitle } = page;
  const description = metaDescription || undefined;
  // The CMS metaTitle already carries the "| AU Industries" brand suffix, so use
  // it verbatim (absolute) to stop the root layout template "%s | AU Industries"
  // appending the brand a second time. A title without the brand (the page.title
  // fallback, or a future clean metaTitle) still gets the template's brand.
  const rawTitle = metaTitle || pageTitle;
  const hasBrand = rawTitle.includes("AU Industries");
  const title: Metadata["title"] = hasBrand ? { absolute: rawTitle } : rawTitle;
  const ogTitle = hasBrand ? rawTitle : `${rawTitle} | AU Industries`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: ogTitle,
      description,
    },
  };
}

export default async function AuIndustriesSlugLayout(props: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const faqs = SERVICE_FAQS[slug];

  if (!faqs || faqs.length === 0) {
    return <>{props.children}</>;
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: FAQPage JSON-LD must be inline JSON for Google to parse
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {props.children}
    </>
  );
}
