import type { MarketingAbout } from "@annix/product-data/marketing";

export function AboutView(props: { about: MarketingAbout }) {
  const about = props.about;
  return (
    <>
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
            {about.heading}
          </h1>
          <p className="mt-6 text-lg text-white/70">{about.body}</p>
        </div>
      </section>
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {about.values.map((value) => (
            <div key={value.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-lg font-semibold text-white">{value.title}</div>
              <p className="mt-2 text-sm text-white/60">{value.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
