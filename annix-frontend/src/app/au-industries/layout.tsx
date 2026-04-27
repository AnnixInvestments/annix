import type { Metadata } from "next";
import { AuIndustriesLayoutClient } from "./AuIndustriesLayoutClient";
import { AU_INDUSTRIES_CONTACT } from "./auIndustriesContact";

const SITE_URL = "https://auind.co.za";
const SITE_DESCRIPTION =
  "AU Industries specialises in rubber lining, rubber sheeting, HDPE lining, and industrial rubber solutions for mining, chemical processing, and water treatment in South Africa.";

export const metadata: Metadata = {
  title: {
    default: "AU Industries - Rubber Lining, Sheeting & Industrial Solutions",
    template: "%s | AU Industries",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: SITE_URL,
    siteName: "AU Industries",
    title: "AU Industries - Rubber Lining, Sheeting & Industrial Solutions",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/au-industries/logo.jpg`,
        width: 400,
        height: 200,
        alt: "AU Industries Logo",
      },
    ],
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [{ url: "/au-industries/logo.jpg", type: "image/jpeg" }],
    shortcut: "/au-industries/logo.jpg",
    apple: "/au-industries/logo.jpg",
  },
  verification: {
    google: "sp2KS-iFxp5dRSfkuMv7xDR6FHve0O4hMfyApm269xk",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: AU_INDUSTRIES_CONTACT.companyName,
  description:
    "BEE Level 4 certified supplier of rubber lining, rubber sheeting, HDPE lining, and industrial rubber solutions for mining, chemical processing, and water treatment in South Africa.",
  url: SITE_URL,
  logo: `${SITE_URL}/au-industries/logo.jpg`,
  image: `${SITE_URL}/au-industries/gallery/gallery29.jpg`,
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
  geo: {
    "@type": "GeoCoordinates",
    latitude: -26.2125,
    longitude: 28.2536,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "17:00",
  },
  areaServed: [
    { "@type": "Country", name: "South Africa" },
    { "@type": "Country", name: "Mozambique" },
    { "@type": "Country", name: "Namibia" },
    { "@type": "Country", name: "Zambia" },
    { "@type": "Country", name: "Botswana" },
    { "@type": "Country", name: "Zimbabwe" },
  ],
  award: "B-BBEE Level 4 Certified — 100% Procurement Recognition",
  additionalProperty: {
    "@type": "PropertyValue",
    name: "B-BBEE Status",
    value: "Level 4",
  },
  priceRange: "$$",
  sameAs: [],
};

export default function AuIndustriesLayout(props: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: LocalBusiness JSON-LD must be inline JSON for Google to parse
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <AuIndustriesLayoutClient>{props.children}</AuIndustriesLayoutClient>
    </>
  );
}
