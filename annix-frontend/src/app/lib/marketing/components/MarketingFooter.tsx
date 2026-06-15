"use client";

import type {
  MarketingFooter as MarketingFooterContent,
  MarketingLegal,
  MarketingLegalDoc,
  MarketingSite,
} from "@annix/product-data/marketing";
import { Facebook, Instagram, Linkedin, type LucideIcon, Send, Youtube } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MARKETING_VERSION } from "@/app/config/marketing/version";
import { useBrandingContext } from "@/app/lib/branding/BrandingProvider";
import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { now } from "@/app/lib/datetime";
import { openCookieSettings } from "@/app/lib/marketing/cookieConsent";
import { useMarketingTranslations } from "@/app/lib/marketing/i18n";
import { subscribeToNewsletter } from "../api";
import { externalHref } from "../url";
import { LegalModal } from "./LegalModal";

function NewsletterSignup(props: { placeholder: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    const trimmed = email.trim();
    if (trimmed.length === 0 || !trimmed.includes("@")) {
      setState("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setState("sending");
    try {
      const result = await subscribeToNewsletter(trimmed);
      setState("done");
      setMessage(result);
      setEmail("");
    } catch (error) {
      setState("error");
      const text =
        error instanceof Error ? error.message : "Could not subscribe — please try again.";
      setMessage(text);
    }
  }

  if (state === "done") {
    return <p className="mt-3 text-sm text-white/70">{message}</p>;
  }

  return (
    <div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
          placeholder={props.placeholder}
          disabled={state === "sending"}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={state === "sending"}
          aria-label="Subscribe"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-900 disabled:opacity-60"
          style={{ backgroundColor: "var(--brand-accent)" }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-red-300">{message}</p>}
    </div>
  );
}

const SOCIAL_ICONS: Record<string, LucideIcon | undefined> = {
  LinkedIn: Linkedin,
  Facebook,
  YouTube: Youtube,
  Instagram,
};

function FooterBrand(props: { site: MarketingSite }) {
  const branding = useBrandingContext();
  const logoUrl = props.site.logoUrl ? props.site.logoUrl : "";
  const wordmarkUrl = props.site.wordmarkImageUrl ? props.site.wordmarkImageUrl : "";
  if (logoUrl || wordmarkUrl) {
    return (
      <span className="flex items-center gap-3 sm:gap-5">
        {logoUrl ? (
          <img src={logoUrl} alt={props.site.wordmark} className="h-[4.5rem] w-auto" />
        ) : null}
        {wordmarkUrl ? (
          <img src={wordmarkUrl} alt={props.site.wordmark} className="h-12 w-auto" />
        ) : null}
      </span>
    );
  }
  const hasLockup = branding ? brandHasAsset("logoLockup", branding) : false;
  if (branding && hasLockup) {
    return (
      <img
        src={resolveBrandAssetUrl("logoLockup", branding)}
        alt={props.site.wordmark}
        className="h-16 w-auto"
      />
    );
  }
  return (
    <span className="text-4xl font-bold tracking-tight text-white">{props.site.wordmark}</span>
  );
}

function FooterCredit(props: { label: string; logoUrl: string; href: string }) {
  const href = externalHref(props.href);
  const logo = <img src={props.logoUrl} alt={props.label} className="h-9 w-auto object-contain" />;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-white/40">{props.label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={props.label}
          className="transition hover:opacity-80"
        >
          {logo}
        </a>
      ) : (
        logo
      )}
    </div>
  );
}

export function MarketingFooter(props: {
  footer: MarketingFooterContent;
  site: MarketingSite;
  legal: MarketingLegal;
}) {
  const footer = props.footer;
  const site = props.site;
  const legal = props.legal;
  const t = useMarketingTranslations("footer");
  const year = now().year;
  const [legalDoc, setLegalDoc] = useState<MarketingLegalDoc | null>(null);
  const legalDocForLabel = (label: string): MarketingLegalDoc | null => {
    const lower = label.toLowerCase();
    if (lower.includes("privacy")) {
      return legal.privacy;
    }
    if (lower.includes("term")) {
      return legal.terms;
    }
    if (lower.includes("cookie")) {
      return legal.cookies;
    }
    return null;
  };
  const designedByLogoUrl = footer.designedByLogoUrl ? footer.designedByLogoUrl : "";
  const hostedByLogoUrl = footer.hostedByLogoUrl ? footer.hostedByLogoUrl : "";
  const hasCredits = designedByLogoUrl !== "" || hostedByLogoUrl !== "";
  return (
    <footer className="border-t border-white/10 px-4 py-14 text-white/70 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <FooterBrand site={site} />
            <p className="mt-3 max-w-xs text-sm text-white/50">{footer.tagline}</p>
          </div>
          {footer.columns.map((column) => (
            <div key={column.heading}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                {column.heading}
              </div>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
              {footer.newsletterHeading}
            </div>
            <p className="text-sm text-white/50">{footer.newsletterBody}</p>
            <NewsletterSignup placeholder={t("emailPlaceholder")} />
            <p className="mt-2 text-xs text-white/40">
              {t("newsletterConsentPrefix")}{" "}
              <button
                type="button"
                onClick={() => setLegalDoc(legal.privacy)}
                className="underline-offset-2 hover:text-white/70 hover:underline"
              >
                {t("privacyPolicy")}
              </button>
              {t("newsletterConsentSuffix")}
            </p>
            <div className="mt-4 flex gap-3">
              {footer.socialLinks.map((social, index) => {
                const Icon = SOCIAL_ICONS[social.platform];
                const href = externalHref(social.href);
                const iconClass =
                  "flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:text-white";
                const inner = Icon ? <Icon className="h-4 w-4" /> : social.platform.slice(0, 1);
                if (!href) {
                  return null;
                }
                return (
                  <a
                    key={`${social.platform}-${index}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                    className={iconClass}
                  >
                    {inner}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {hasCredits ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-white/10 pt-6">
            {designedByLogoUrl ? (
              <FooterCredit
                label={t("designedBy")}
                logoUrl={designedByLogoUrl}
                href={footer.designedByUrl}
              />
            ) : null}
            {hostedByLogoUrl ? (
              <FooterCredit
                label={t("hostedBy")}
                logoUrl={hostedByLogoUrl}
                href={footer.hostedByUrl}
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <span>
            © {year} Annix Investments (Pty) Ltd. {footer.legal}
          </span>
          <div className="flex items-center gap-4">
            {footer.legalLinks.map((link) => {
              const doc = legalDocForLabel(link.label);
              if (doc) {
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => setLegalDoc(doc)}
                    className="transition hover:text-white"
                  >
                    {link.label}
                  </button>
                );
              }
              return (
                <Link key={link.label} href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openCookieSettings}
              className="transition hover:text-white"
            >
              {t("cookieSettings")}
            </button>
            <span>v{MARKETING_VERSION}</span>
          </div>
        </div>
      </div>
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </footer>
  );
}
