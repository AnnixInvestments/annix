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

  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    const observer = new MutationObserver(() => {
      if (html.classList.contains("dark")) {
        html.classList.remove("dark");
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      if (wasDark) html.classList.add("dark");
    };
  }, []);

  const companyName = AU_INDUSTRIES_CONTACT.companyName;
  const phone = AU_INDUSTRIES_CONTACT.phone;
  const email = AU_INDUSTRIES_CONTACT.email;
  const address = AU_INDUSTRIES_CONTACT.address;

  return (
    <EditModeProvider isAdmin={isAdmin}>
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
