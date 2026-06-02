import Link from "next/link";

const FEATURES: { title: string; description: string }[] = [
  {
    title: "AI candidate analysis",
    description: "Extract, score and summarise CVs so you shortlist faster.",
  },
  {
    title: "Talent pools",
    description: "Build searchable, intelligent candidate pools from your database.",
  },
  {
    title: "Smart matching",
    description: "Match the right candidates to the right vacancy in seconds.",
  },
  {
    title: "Compliance tracking",
    description: "POPIA-aware consent and visibility on every candidate, by design.",
  },
  {
    title: "Placement tracking",
    description: "From offer to guarantee, invoice and payment — never lose a fee.",
  },
];

const FOUNDING_PERKS: string[] = [
  "Free for 6 months",
  "Unlimited candidates",
  "Unlimited jobs",
  "Priority support",
  "Direct influence on the roadmap",
  "Founding Partner badge",
];

export default function ForRecruitersPage() {
  return (
    <div className="min-h-screen bg-[#0A1B3D] text-white">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <p
          className="text-sm font-semibold tracking-widest uppercase mb-4"
          style={{ color: "#FF8A00" }}
        >
          Annix Orbit Recruiter
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Recruiters don't get paid to read CVs.
          <br />
          <span style={{ color: "#FF8A00" }}>They get paid to make placements.</span>
        </h1>
        <p className="mt-6 text-lg text-[#c0c0eb] max-w-2xl">
          Annix Orbit Recruiter helps recruitment agencies manage candidates, match talent faster,
          reduce admin and close more placements. Smarter tools. Stronger placements.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/annix/orbit/register/recruiter"
            className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-[#0A1B3D]"
            style={{ backgroundColor: "#FF8A00" }}
          >
            Join the Founding Recruiter Programme
          </Link>
          <Link
            href="/annix/orbit/login?type=recruiter"
            className="inline-flex items-center px-6 py-3 rounded-lg font-medium border border-[#4a4da3] text-white hover:bg-white/10 transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-[#4a4da3]/40 bg-white/5 p-6"
            >
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-[#c0c0eb]">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-[#FF8A00]/40 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Founding Recruiter Programme — now open</h2>
          <p className="mt-2 text-[#c0c0eb]">
            We're inviting a select group of agencies to shape Orbit Recruiter as founding partners.
          </p>
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FOUNDING_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-sm">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: "#FF8A00" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              href="/annix/orbit/register/recruiter"
              className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-[#0A1B3D]"
              style={{ backgroundColor: "#FF8A00" }}
            >
              Become a founding recruiter
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/annix/orbit" className="text-sm text-[#c0c0eb] hover:text-white">
            Back to Annix Orbit
          </Link>
        </div>
      </div>
    </div>
  );
}
