"use client";

import type { MarketingSiteContent } from "@annix/product-data/marketing";
import type { ReactNode } from "react";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { MASTER_BRAND_CODE } from "@/app/lib/branding/branding";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";

export function MarketingShell(props: { content: MarketingSiteContent; children: ReactNode }) {
  const content = props.content;
  return (
    <BrandingProvider brand={MASTER_BRAND_CODE} surface={false}>
      <div
        className="relative min-h-screen overflow-hidden text-white"
        style={{
          backgroundImage:
            "linear-gradient(180deg, var(--brand-grad-from), var(--brand-grad-via) 45%, var(--brand-grad-to))",
        }}
      >
        <MarketingNav products={content.ecosystem.products} />
        <main>{props.children}</main>
        <MarketingFooter footer={content.footer} />
      </div>
    </BrandingProvider>
  );
}
