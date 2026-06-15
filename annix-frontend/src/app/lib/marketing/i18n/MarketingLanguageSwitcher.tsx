"use client";

import { MARKETING_LOCALE_META } from "@annix/product-data/marketing";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useState } from "react";
import { useMarketingLocale } from "./MarketingI18nProvider";
import { useMarketingTranslations } from "./useMarketingTranslations";

export function MarketingLanguageSwitcher(props: { variant?: "nav" | "mobile" }) {
  const variant = props.variant ? props.variant : "nav";
  const { locale, setLocale } = useMarketingLocale();
  const t = useMarketingTranslations("language");
  const [open, setOpen] = useState(false);
  const current = MARKETING_LOCALE_META.find((entry) => entry.code === locale);
  const currentLabel = current ? current.code.toUpperCase() : "EN";

  if (variant === "mobile") {
    return (
      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/40">
          <Globe className="h-3.5 w-3.5" />
          {t("label")}
        </div>
        <div className="flex flex-wrap gap-2">
          {MARKETING_LOCALE_META.map((entry) => {
            const active = entry.code === locale;
            return (
              <button
                key={entry.code}
                type="button"
                onClick={() => setLocale(entry.code)}
                className={
                  active
                    ? "rounded-lg border border-[var(--brand-accent)] px-3 py-1.5 text-sm font-semibold text-white"
                    : "rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
                }
              >
                {entry.nativeName}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-white/70 transition hover:text-white"
        aria-label={t("select")}
      >
        <Globe className="h-4 w-4" />
        {currentLabel}
        <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full w-44 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
          {MARKETING_LOCALE_META.map((entry) => {
            const active = entry.code === locale;
            return (
              <button
                key={entry.code}
                type="button"
                onClick={() => {
                  setLocale(entry.code);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
              >
                {entry.nativeName}
                {active ? <Check className="h-4 w-4 text-[var(--brand-accent)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
