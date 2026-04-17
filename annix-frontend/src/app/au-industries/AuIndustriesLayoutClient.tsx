"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { browserBaseUrl } from "@/lib/api-config";
import { AuIndustriesFooter } from "./components/AuIndustriesFooter";
import { AuIndustriesNav } from "./components/AuIndustriesNav";
import { WhatsAppButton } from "./components/WhatsAppButton";
import { EditModeProvider } from "./context/EditModeContext";

interface NavPage {
  slug: string;
  title: string;
  isHomePage: boolean;
}

interface CompanyProfile {
  tradingName: string;
  phone: string;
  generalEmail: string;
  streetAddress: string;
  city: string;
  province: string;
}

const GA_MEASUREMENT_ID = "G-SSG705PB3R";

function hasAuRubberToken(): boolean {
  if (typeof window === "undefined") return false;
  const token =
    localStorage.getItem("auRubberAccessToken") || sessionStorage.getItem("auRubberAccessToken");
  return !!token;
}

export function AuIndustriesLayoutClient(props: { children: React.ReactNode }) {
  const [pages, setPages] = useState<NavPage[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(hasAuRubberToken());

    const base = browserBaseUrl();
    fetch(`${base}/public/au-industries/pages`)
      .then((res) => res.json())
      .then((data) => setPages(data))
      .catch(() => {});

    fetch(`${base}/public/company-profile`)
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const companyName = profile?.tradingName || "AU Industries";
  const phone = profile?.phone || "+27 11 000 0000";
  const email = profile?.generalEmail || "info@example.com";
  const address = profile ? `${profile.streetAddress}, ${profile.city}, ${profile.province}` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: companyName,
    description:
      "BEE Level 4 certified supplier of rubber lining, rubber sheeting, HDPE lining, and industrial rubber solutions for mining, chemical processing, and water treatment in South Africa.",
    url: "https://auind.co.za",
    logo: "https://auind.co.za/au-industries/logo.jpg",
    image: "https://auind.co.za/au-industries/hero-excavator.jpg",
    telephone: phone,
    email: email,
    address: profile
      ? {
          "@type": "PostalAddress",
          streetAddress: profile.streetAddress,
          addressLocality: profile.city,
          addressRegion: profile.province,
          addressCountry: "ZA",
        }
      : undefined,
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

        <AuIndustriesNav pages={pages} />

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
