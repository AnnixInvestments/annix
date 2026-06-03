import type { MarketingAbout } from "@annix/product-data/marketing";

export function AboutView(props: {
  about: MarketingAbout;
  heroImageUrl: string | null;
  bottomImageUrl: string | null;
}) {
  const about = props.about;
  const heroImageUrl = props.heroImageUrl ? props.heroImageUrl : "";
  const bottomImageUrl = props.bottomImageUrl ? props.bottomImageUrl : "";
  const leadImageUrl = about.leadImageUrl ? about.leadImageUrl : "";
  const storyImageUrl = about.storyImageUrl ? about.storyImageUrl : "";
  const missionImageUrl = about.missionImageUrl ? about.missionImageUrl : "";
  const storyParagraphs = about.storyBody.split("\n\n");

  return (
    <div className="relative overflow-hidden">
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

      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="text-4xl font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {about.heading}
          </h1>
          <p className="mt-6 text-lg text-white/70">{about.body}</p>
        </div>
        {leadImageUrl ? (
          <div className="mx-auto mt-12 max-w-5xl">
            <img
              src={leadImageUrl}
              alt=""
              className="aspect-[21/9] w-full rounded-3xl border border-white/10 object-cover"
            />
          </div>
        ) : null}
      </section>

      <section className="relative px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <h2
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "var(--brand-font-display)" }}
            >
              {about.storyHeading}
            </h2>
            <div className="mt-5 space-y-4">
              {storyParagraphs.map((paragraph, index) => (
                <p key={`story-${index}`} className="text-lg leading-relaxed text-white/70">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          {storyImageUrl ? (
            <img
              src={storyImageUrl}
              alt=""
              className="aspect-[4/3] w-full rounded-3xl border border-white/10 object-cover"
            />
          ) : (
            <div className="aspect-[4/3] w-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent" />
          )}
        </div>
      </section>

      <section className="relative px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {about.values.map((value) => (
            <div key={value.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-lg font-semibold text-white">{value.title}</div>
              <p className="mt-2 text-sm text-white/60">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
                Our mission
              </div>
              <p className="mt-4 text-2xl font-semibold leading-snug text-white">{about.mission}</p>
            </div>
            {missionImageUrl ? (
              <img
                src={missionImageUrl}
                alt=""
                className="h-full min-h-[16rem] w-full object-cover"
              />
            ) : (
              <div className="min-h-[16rem] w-full bg-gradient-to-br from-[var(--brand-accent)]/20 to-transparent" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
