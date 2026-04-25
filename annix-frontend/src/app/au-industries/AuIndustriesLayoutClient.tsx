"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { browserBaseUrl } from "@/lib/api-config";
import { AU_INDUSTRIES_CONTACT } from "./auIndustriesContact";
import { AuIndustriesFooter } from "./components/AuIndustriesFooter";
import { AuIndustriesNav } from "./components/AuIndustriesNav";
import { WhatsAppButton } from "./components/WhatsAppButton";
import { EditModeProvider } from "./context/EditModeContext";

interface NavPage {
  slug: string;
  title: string;
  isHomePage: boolean;
  showInNav?: boolean;
}

const GA_MEASUREMENT_ID = "G-SSG705PB3R";

function hasAuRubberToken(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return false;
  const token =
    localStorage.getItem("auRubberAccessToken") || sessionStorage.getItem("auRubberAccessToken");
  return !!token;
}

export function AuIndustriesLayoutClient(props: { children: React.ReactNode }) {
  const [pages, setPages] = useState<NavPage[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(hasAuRubberToken());

    const base = browserBaseUrl();
    fetch(`${base}/public/au-industries/pages`)
      .then((res) => res.json())
      .then((data) => setPages(data))
      .catch(() => {});
  }, []);

  const companyName = AU_INDUSTRIES_CONTACT.companyName;
  const phone = AU_INDUSTRIES_CONTACT.phone;
  const email = AU_INDUSTRIES_CONTACT.email;
  const address = AU_INDUSTRIES_CONTACT.address;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: companyName,
    description:
      "BEE Level 4 certified supplier of rubber lining, rubber sheeting, HDPE lining, and industrial rubber solutions for mining, chemical processing, and water treatment in South Africa.",
    url: "https://auind.co.za",
    logo: "https://auind.co.za/au-industries/logo.jpg",
    image: "https://auind.co.za/au-industries/gallery/gallery29.jpg",
    telephone: phone,
    email: email,
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

  return (
    <EditModeProvider isAdmin={isAdmin}>
      <div className="min-h-screen flex flex-col bg-white text-gray-900">
        <Script id="au-industries-jsonld" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(jsonLd)}
        </Script>

        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
        </Script>

        <Script
          src="https://static.elfsight.com/platform/platform.js"
          strategy="afterInteractive"
        />

        <AuIndustriesNav pages={pages.filter((p) => p.showInNav !== false)} />

        <main className="flex-1">{props.children}</main>

        <AuIndustriesFooter
          companyName={companyName}
          phone={phone}
          email={email}
          address={address}
        />

        <WhatsAppButton phone="+27720398429" />
      </div>
    </EditModeProvider>
  );
}
