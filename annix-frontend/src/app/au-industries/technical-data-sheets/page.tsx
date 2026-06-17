import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

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
  isPublished: boolean;
}

export const metadata: Metadata = {
  title: "Technical Data Sheets — Rubber Compounds & Linings",
  description:
    "Download technical data sheets for AU Industries rubber linings and compounds — natural rubber (38/40/60 shore), nitrile (NBR), neoprene and bromobutyl. Mining-grade compounds with full physical properties, ISO test methods and batch traceability. Made in South Africa.",
  alternates: { canonical: `${SITE_URL}/technical-data-sheets` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/technical-data-sheets`,
    title: "Rubber Compound Technical Data Sheets | AU Industries",
    description:
      "Full physical properties, ISO test methods and downloadable data sheets for AU Industries mining-grade rubber linings and compounds.",
    images: [
      {
        url: `${SITE_URL}/au-industries/AUI-banner8.jpg`,
        alt: "AU Industries rubber compound technical data sheets",
      },
    ],
  },
};

async function fetchDataSheets(): Promise<PublicDataSheet[]> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];
  if (host.length === 0) {
    return [];
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const apiBase = `${protocol}://${host}/api`;
  try {
    const res = await fetch(`${apiBase}/public/au-industries/data-sheets`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  } catch {
    return [];
  }
}

function buildJsonLd(sheets: PublicDataSheet[]) {
  if (sheets.length === 0) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AU Industries Rubber Compound Data Sheets",
    url: `${SITE_URL}/technical-data-sheets`,
    numberOfItems: sheets.length,
    itemListElement: sheets.map((sheet, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/technical-data-sheets/${sheet.slug}`,
      name: sheet.name,
    })),
  };
}

const CATEGORY_ORDER = [
  "Natural Rubber Lining",
  "Premium Silica-Reinforced",
  "Specialty Compounds",
  "Branded Grades",
];

export default async function DataSheetsIndexPage() {
  const sheets = await fetchDataSheets();
  const jsonLd = buildJsonLd(sheets);
  const hasSheets = sheets.length > 0;

  const categories = CATEGORY_ORDER.filter((category) =>
    sheets.some((sheet) => sheet.category === category),
  );
  const extraCategories = [
    ...new Set(sheets.map((sheet) => sheet.category).filter((c) => !CATEGORY_ORDER.includes(c))),
  ];
  const orderedCategories = [...categories, ...extraCategories];

  return (
    <div>
      {jsonLd !== null && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Data-sheet JSON-LD must be inline JSON for Google to parse
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <section className="relative h-56 md:h-72">
        <Image
          src="/au-industries/AUI-banner8.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-4xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider mb-3">
            Technical Data Sheets
          </h1>
          <p className="text-[#efcc54] text-base md:text-lg max-w-2xl">
            Full physical properties, ISO test methods and downloadable PDFs for our mining-grade
            rubber linings and compounds
          </p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="prose max-w-none mb-10 text-gray-700">
            <p className="text-lg leading-relaxed">
              AU Industries manufactures mining-grade rubber linings and compounds in Boksburg,
              Gauteng — supplied with full technical data sheets, ISO-referenced physical properties
              and batch traceability. Every compound below is produced in-house for consistent
              quality, from soft 38 shore wet-slurry linings to hard 60 shore cut-and-tear grades,
              acid-resistant bromobutyl and oil-resistant nitrile.
            </p>
          </div>

          {hasSheets ? (
            orderedCategories.map((category) => {
              const items = sheets.filter((sheet) => sheet.category === category);
              return (
                <div key={category} className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{category}</h2>
                  <div className="h-1 w-16 bg-[#efcc54] mb-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {items.map((sheet) => (
                      <DataSheetCard key={sheet.id} sheet={sheet} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Data sheets are being published — please check back shortly or contact us for any
                compound specification.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DataSheetCard(props: { sheet: PublicDataSheet }) {
  const sheet = props.sheet;
  const hasPdf = sheet.pdfStatus === "available" && sheet.pdfUrl !== null;

  return (
    <Link
      href={`/technical-data-sheets/${sheet.slug}`}
      className="group block bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg hover:border-[#efcc54] transition-all p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-900 text-[#efcc54]">
          {sheet.shoreHardness}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          {sheet.colour}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          {sheet.cureMethod}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 leading-snug mb-2 text-base group-hover:text-[#8A6608]">
        {sheet.name}
      </h3>
      <p className="text-sm text-gray-600 line-clamp-3 mb-4">{sheet.shortDescription}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{sheet.polymer}</span>
        <span className={`text-xs font-semibold ${hasPdf ? "text-[#8A6608]" : "text-gray-400"}`}>
          {hasPdf ? "View & download →" : "View specs →"}
        </span>
      </div>
    </Link>
  );
}
