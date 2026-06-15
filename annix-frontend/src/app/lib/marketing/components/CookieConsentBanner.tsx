"use client";

import type { MarketingLegalDoc } from "@annix/product-data/marketing";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { logCookieConsent } from "@/app/lib/marketing/api";
import {
  COOKIE_SETTINGS_EVENT,
  type CookieConsentChoices,
  readConsent,
  saveConsent,
} from "@/app/lib/marketing/cookieConsent";
import { useMarketingTranslations } from "@/app/lib/marketing/i18n";
import { LegalModal } from "./LegalModal";

function Toggle(props: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
      <span>{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--brand-accent)]"
      />
    </label>
  );
}

export function CookieConsentBanner(props: { cookiePolicy: MarketingLegalDoc }) {
  const t = useMarketingTranslations("cookies");
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [dismissable, setDismissable] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    function handleOpenSettings() {
      const stored = readConsent();
      if (stored) {
        setFunctional(stored.functional);
        setAnalytics(stored.analytics);
        setMarketing(stored.marketing);
      }
      setManaging(true);
      setDismissable(true);
      setVisible(true);
    }
    window.addEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
  }, []);

  function persist(choices: CookieConsentChoices) {
    const consent = saveConsent(choices);
    logCookieConsent({
      consentId: consent.consentId,
      necessary: consent.necessary,
      functional: consent.functional,
      analytics: consent.analytics,
      marketing: consent.marketing,
    });
    setVisible(false);
    setManaging(false);
  }

  function acceptAll() {
    persist({ functional: true, analytics: true, marketing: true });
  }

  function rejectNonEssential() {
    persist({ functional: false, analytics: false, marketing: false });
  }

  function saveSelection() {
    persist({ functional, analytics, marketing });
  }

  return (
    <>
      {visible ? (
        <div className="fixed inset-x-0 bottom-0 z-[9998] px-4 pb-4 sm:px-6">
          <div
            className="mx-auto max-w-4xl rounded-2xl border bg-[#0a1733] p-5 shadow-2xl"
            style={{ borderColor: "color-mix(in srgb, var(--brand-accent) 45%, transparent)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-white">{t("title")}</div>
              {dismissable ? (
                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className="rounded-lg p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                  aria-label={t("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-white/60">
              {t("body")}{" "}
              <button
                type="button"
                onClick={() => setPolicyOpen(true)}
                className="font-medium text-[var(--brand-accent)] underline-offset-2 hover:underline"
              >
                {t("cookiePolicy")}
              </button>
              .
            </p>

            {managing ? (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/50">
                  <span>{t("strictlyNecessary")}</span>
                  <input type="checkbox" checked disabled className="h-4 w-4" />
                </label>
                <Toggle label={t("functional")} checked={functional} onChange={setFunctional} />
                <Toggle label={t("analytics")} checked={analytics} onChange={setAnalytics} />
                <Toggle label={t("marketing")} checked={marketing} onChange={setMarketing} />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-900"
                style={{ backgroundColor: "var(--brand-accent)" }}
              >
                {t("acceptAll")}
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {t("rejectNonEssential")}
              </button>
              {managing ? (
                <button
                  type="button"
                  onClick={saveSelection}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {t("savePreferences")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setManaging(true)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white"
                >
                  {t("managePreferences")}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <LegalModal
        doc={policyOpen ? props.cookiePolicy : null}
        onClose={() => setPolicyOpen(false)}
      />
    </>
  );
}
