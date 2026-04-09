"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { browserBaseUrl } from "@/lib/api-config";
import { AuIndustriesFooter } from "./components/AuIndustriesFooter";
import { AuIndustriesNav } from "./components/AuIndustriesNav";
import { WhatsAppButton } from "./components/WhatsAppButton";

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

export function AuIndustriesLayoutClient(props: { children: React.ReactNode }) {
  const [pages, setPages] = useState<NavPage[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
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

      <Script src="https://static.elfsight.com/platform/platform.js" strategy="afterInteractive" />

      <AuIndustriesNav pages={pages} />

      <main className="flex-1">{props.children}</main>

      <AuIndustriesFooter companyName={companyName} phone={phone} email={email} address={address} />

      <WhatsAppButton phone="+27720398429" />
    </div>
  );
}
