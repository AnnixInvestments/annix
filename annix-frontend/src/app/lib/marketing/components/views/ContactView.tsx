import { MarketingContactForm } from "../MarketingContactForm";

export function ContactView() {
  return (
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
  );
}
