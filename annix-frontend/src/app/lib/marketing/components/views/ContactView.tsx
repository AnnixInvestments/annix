import { MarketingContactForm } from "../MarketingContactForm";

export function ContactView(props: { heroImageUrl: string | null; bottomImageUrl: string | null }) {
  const heroImageUrl = props.heroImageUrl ? props.heroImageUrl : "";
  const bottomImageUrl = props.bottomImageUrl ? props.bottomImageUrl : "";
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      {heroImageUrl ? (
        <>
          <div className="absolute inset-x-0 top-0 h-[26rem]">
            <img src={heroImageUrl} alt="" className="h-full w-full object-cover object-top" />
          </div>
          <div
            className="absolute inset-x-0 top-0 h-[26rem]"
            style={{
              backgroundImage: "linear-gradient(180deg, rgba(10,23,51,0.45) 0%, #0a1733 92%)",
            }}
          />
        </>
      ) : null}
      {bottomImageUrl ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[22rem]">
            <img src={bottomImageUrl} alt="" className="h-full w-full object-cover object-bottom" />
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-[22rem]"
            style={{ backgroundImage: "linear-gradient(0deg, transparent 0%, #0a1733 78%)" }}
          />
        </>
      ) : null}

      <div className="relative mx-auto max-w-2xl">
        <h1
          className="text-4xl font-bold text-white sm:text-5xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          Let&apos;s talk.
        </h1>
        <p className="mt-4 text-lg text-white/70">
          Book a demo and we will show you the Annix products that fit your operation.
        </p>
        <div className="mt-10 rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur sm:p-8">
          <MarketingContactForm />
        </div>
      </div>
    </section>
  );
}
