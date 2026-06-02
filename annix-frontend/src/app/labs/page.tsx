import type { Metadata } from "next";
import { fetchPublishedMarketingContent } from "@/app/lib/marketing/api";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";

export const metadata: Metadata = {
  title: "Annix Labs — What's next",
  description: "The next wave of Annix products, built on the same shared platform.",
};

export default async function LabsPage() {
  const content = await fetchPublishedMarketingContent();
  const labs = content.labs;
  return (
    <MarketingShell content={content}>
      <section
        className="px-4 py-24 sm:px-6 lg:px-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--brand-grad-from), var(--brand-grad-via), var(--brand-grad-to))",
        }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="text-4xl font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {labs.heading}
          </h1>
          <p className="mt-6 text-lg text-white/70">{labs.subheading}</p>
        </div>
      </section>
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
          {labs.items.map((item) => (
            <div key={item.name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                {item.status}
              </span>
              <div className="mt-3 text-lg font-semibold text-white">{item.name}</div>
              <p className="mt-2 text-sm text-white/60">{item.blurb}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
