"use client";

import type { MarketingLegalDoc } from "@annix/product-data/marketing";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useMarketingTranslations } from "@/app/lib/marketing/i18n";
import { LegalDocBody } from "./views/LegalView";

export function LegalModal(props: { doc: MarketingLegalDoc | null; onClose: () => void }) {
  const t = useMarketingTranslations("legal");
  const doc = props.doc;
  if (!doc) {
    return null;
  }
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={props.onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a1733] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <h2
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--brand-font-display)" }}
            >
              {doc.heading}
            </h2>
            {doc.lastUpdated ? (
              <p className="mt-1 text-xs text-white/40">
                {t("lastUpdated")} {doc.lastUpdated}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <LegalDocBody body={doc.body} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
