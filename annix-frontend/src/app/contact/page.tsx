import type { Metadata } from "next";
import { fetchPublishedMarketingContent } from "@/app/lib/marketing/api";
import { MarketingContactForm } from "@/app/lib/marketing/components/MarketingContactForm";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";

export const metadata: Metadata = {
  title: "Contact Annix — Book a demo",
  description: "Book a walkthrough of the Annix platform or get in touch with our team.",
};

export default async function ContactPage() {
  const content = await fetchPublishedMarketingContent();
  return (
    <MarketingShell content={content}>
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1
            className="text-4xl font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            Let&apos;s talk.
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Book a demo and we will show you the Annix products that fit your operation.
          </p>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <MarketingContactForm />
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
