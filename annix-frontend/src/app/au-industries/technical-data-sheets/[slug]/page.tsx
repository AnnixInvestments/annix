import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

const SITE_URL = "https://auind.co.za";

interface PublicDataSheet {
  id: string;
  slug: string;
  name: string;
  code: string;
  category: string;
  polymer: string;
  shoreHardness: string;
  colour: string;
  cureMethod: string;
  shortDescription: string;
  applications: string[];
  notRecommended: string;
  specs: { label: string; value: string; method?: string | null }[];
  pdfUrl: string | null;
  pdfStatus: string;
  revision: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
}

async function fetchSheet(slug: string): Promise<PublicDataSheet | null> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];
  if (host.length === 0) {
    return null;
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const apiBase = `${protocol}://${host}/api`;
  try {
    const res = await fetch(`${apiBase}/public/au-industries/data-sheets/${slug}`, {
      next: { revalidate: 300 },
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
  const params = await props.params;
  const sheet = await fetchSheet(params.slug);
  if (!sheet) {
    return { title: "Data Sheet Not Found" };
  }
  const metaTitle = sheet.metaTitle;
  const metaDescription = sheet.metaDescription;
  const shortDescription = sheet.shortDescription;
  const title = metaTitle || `${sheet.name} | AU Industries`;
  const description = metaDescription || shortDescription || `${sheet.name} technical data sheet.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/technical-data-sheets/${sheet.slug}` },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/technical-data-sheets/${sheet.slug}`,
      title,
      description,
      images: [{ url: `${SITE_URL}/au-industries/AUI-banner8.jpg`, alt: sheet.name }],
    },
  };
}

function buildJsonLd(sheet: PublicDataSheet) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sheet.name,
    sku: sheet.code,
    category: sheet.category,
    description: sheet.shortDescription,
    brand: { "@type": "Brand", name: "AU Industries" },
    manufacturer: { "@type": "Organization", name: "AU Industries (Pty) Ltd" },
    material: sheet.polymer,
    url: `${SITE_URL}/technical-data-sheets/${sheet.slug}`,
    additionalProperty: sheet.specs.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value,
    })),
  };
}

function buildBreadcrumbJsonLd(sheet: PublicDataSheet) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Technical Data Sheets",
        item: `${SITE_URL}/technical-data-sheets`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: sheet.name,
        item: `${SITE_URL}/technical-data-sheets/${sheet.slug}`,
      },
    ],
  };
}

export default async function DataSheetDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const sheet = await fetchSheet(params.slug);
  if (!sheet) {
    notFound();
  }

  const jsonLd = buildJsonLd(sheet);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(sheet);
  const hasPdf = sheet.pdfStatus === "available" && sheet.pdfUrl !== null;
  const pdfUrl = sheet.pdfUrl;

  return (
    <div>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Product JSON-LD must be inline JSON for Google to parse
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Breadcrumb JSON-LD must be inline JSON for Google to parse
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="bg-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            href="/technical-data-sheets"
            className="text-sm text-[#efcc54] hover:underline mb-4 inline-block"
          >
            ← All data sheets
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#efcc54] text-gray-900">
              {sheet.shoreHardness}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white">
              {sheet.colour}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white">
              {sheet.cureMethod}
            </span>
            {sheet.code !== "" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono bg-white/10 text-white/80">
                {sheet.code}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">{sheet.name}</h1>
          <p className="text-gray-300 mt-3 max-w-2xl">{sheet.shortDescription}</p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Physical Properties</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Test Method
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sheet.specs.map((spec) => {
                    const method = spec.method;
                    return (
                      <tr key={spec.label}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {spec.label}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{spec.value}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{method || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sheet.applications.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Typical Applications</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sheet.applications.map((application) => (
                    <li key={application} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-[#8A6608] mt-0.5">▪</span>
                      {application}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sheet.notRecommended !== "" && (
              <div className="mt-8 rounded-lg bg-amber-50 border border-amber-200 p-4">
                <h3 className="text-sm font-bold text-amber-900 mb-1">Not recommended for</h3>
                <p className="text-sm text-amber-800">{sheet.notRecommended}</p>
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-lg border border-gray-200 p-5 bg-gray-50 sticky top-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Data Sheet</h3>
              {hasPdf && pdfUrl !== null ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-gray-900 text-[#efcc54] rounded-lg hover:bg-gray-800 transition-colors font-semibold text-sm"
                >
                  Download PDF
                </a>
              ) : (
                <div className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-center">
                  PDF coming soon — contact us for the latest signed data sheet.
                </div>
              )}
              {sheet.revision !== "" && (
                <p className="text-xs text-gray-400 mt-3">Revision: {sheet.revision}</p>
              )}
              <div className="mt-5 pt-5 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">
                  Need a specific shore, colour or compound? We manufacture to spec with full batch
                  traceability.
                </p>
                <Link
                  href="/quote"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-[#efcc54] transition-colors font-semibold text-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
