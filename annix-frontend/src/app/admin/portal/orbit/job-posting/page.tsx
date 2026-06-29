"use client";

import { CheckCircle2, ExternalLink, FileCode2, Globe2, Handshake, MailCheck } from "lucide-react";

type ChannelPriority = "Build first" | "Test next" | "Assisted test";
type ChannelMode = "Schema + indexing" | "XML feed" | "Manual free-board pack" | "Email/manual";

interface JobPostingChannel {
  name: string;
  priority: ChannelPriority;
  mode: ChannelMode;
  reach: string;
  why: string;
  wireUp: string;
  status: string;
  href: string;
}

const channels: JobPostingChannel[] = [
  {
    name: "Google for Jobs",
    priority: "Build first",
    mode: "Schema + indexing",
    reach: "Google Search visibility for every public Orbit job page.",
    why: "Free, high-volume discovery channel and already aligned to Orbit public job pages.",
    wireUp:
      "Validate the existing JobPosting JSON-LD, add active jobs to sitemap, then call Google Indexing API when a job is published or closed.",
    status: "Best first integration because Orbit controls the public page and schema.",
    href: "https://developers.google.com/search/docs/appearance/structured-data/job-posting",
  },
  {
    name: "Orbit Jobs XML feed",
    priority: "Build first",
    mode: "XML feed",
    reach: "Canonical feed for aggregators and future approved partners.",
    why: "Keeps Orbit as the master source while giving boards a stable pull endpoint.",
    wireUp:
      "Harden /annix-orbit/public/jobs.xml, document field mapping, add feed health checks and expose copyable feed URLs in admin.",
    status: "Already partially present; should be treated as the distribution backbone.",
    href: "/api/annix-orbit/public/jobs.xml",
  },
  {
    name: "Job Mail",
    priority: "Test next",
    mode: "Manual free-board pack",
    reach: "Large South African job-seeker audience.",
    why: "Good local relevance and worth testing for company-created vacancies.",
    wireUp:
      "Generate title, body, salary, location, apply email and Orbit public URL; let admin mark the posting as submitted after pasting it.",
    status: "Use assisted workflow first unless a formal free API/feed is confirmed.",
    href: "https://www.jobmail.co.za/",
  },
  {
    name: "FreeRecruit",
    priority: "Test next",
    mode: "Manual free-board pack",
    reach: "South African free recruitment board.",
    why: "Advertises free posting and is practical for early distribution tests.",
    wireUp:
      "Create an assisted adapter with a deep link and reusable posting copy; track manual submission and applicant source.",
    status: "Good low-risk test channel for manual distribution.",
    href: "https://www.freerecruit.co.za/post-jobs-for-free/",
  },
  {
    name: "Jooble",
    priority: "Test next",
    mode: "XML feed",
    reach: "Aggregator reach via feed/ATS style publishing.",
    why: "Closest match for a free feed-based integration after Google.",
    wireUp:
      "Submit Orbit's XML feed to Jooble for approval, then add a feed adapter that records submitted/discoverable rather than posted.",
    status: "Needs partner/feed acceptance before claiming automatic posting.",
    href: "https://help.jooble.org/en/support/solutions/articles/60000700159-can-i-publish-my-vacancies-via-ats-",
  },
  {
    name: "JobisJob South Africa",
    priority: "Test next",
    mode: "XML feed",
    reach: "Aggregator-style reach for South African jobs.",
    why: "Useful if they consume Orbit's feed without paid placement.",
    wireUp:
      "Verify feed intake requirements, then map Orbit fields to their format or keep it as an assisted/free-board candidate.",
    status: "Investigate as feed-first; avoid one-click claims until accepted.",
    href: "https://www.jobisjob.co.za/",
  },
  {
    name: "Gumtree Jobs",
    priority: "Assisted test",
    mode: "Email/manual",
    reach: "Useful for blue-collar, trades, admin and local roles.",
    why: "Good practical audience, but not a reliable open API route.",
    wireUp:
      "Reclassify as assisted unless a real posting endpoint exists; generate posting copy and require manual confirmation.",
    status: "Do not auto-mark success from an internal email alone.",
    href: "https://www.gumtree.co.za/",
  },
  {
    name: "Snaphunt",
    priority: "Assisted test",
    mode: "Manual free-board pack",
    reach: "International reach with matching/distribution tooling.",
    why: "Worth testing for professional and remote-friendly roles.",
    wireUp:
      "Add assisted posting copy and track source attribution; revisit API/feed only after confirming a free employer route.",
    status: "Good manual test, not first API integration.",
    href: "https://snaphunt.com/employers",
  },
  {
    name: "Virtual Staff SA",
    priority: "Assisted test",
    mode: "Manual free-board pack",
    reach: "Remote and virtual assistant roles in South Africa.",
    why: "Best for a subset of roles rather than every Orbit vacancy.",
    wireUp:
      "Offer it only for remote/admin/support roles and include role-fit guidance in the assisted posting pack.",
    status: "Useful niche channel for remote work.",
    href: "https://virtualstaffsa.com/",
  },
  {
    name: "PostJobFree",
    priority: "Assisted test",
    mode: "Manual free-board pack",
    reach: "Broad free-board reach with simple posting flow.",
    why: "Low-cost way to test applicant source quality outside South Africa-specific boards.",
    wireUp:
      "Generate posting copy, include the Orbit public apply link, and track applications with source tags.",
    status: "Manual first; feed/API can follow if source quality is worthwhile.",
    href: "https://www.postjobfree.com/",
  },
];

const priorityStyles: Record<ChannelPriority, string> = {
  "Build first": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Test next": "bg-sky-50 text-sky-700 border-sky-200",
  "Assisted test": "bg-amber-50 text-amber-700 border-amber-200",
};

const modeIcon: Record<ChannelMode, React.ReactNode> = {
  "Schema + indexing": <Globe2 className="h-4 w-4" aria-hidden="true" />,
  "XML feed": <FileCode2 className="h-4 w-4" aria-hidden="true" />,
  "Manual free-board pack": <Handshake className="h-4 w-4" aria-hidden="true" />,
  "Email/manual": <MailCheck className="h-4 w-4" aria-hidden="true" />,
};

function ChannelCard(props: { channel: JobPostingChannel }) {
  const channel = props.channel;
  const priorityClass = priorityStyles[channel.priority];
  const isInternal = channel.href.startsWith("/");

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{channel.name}</h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass}`}
            >
              {channel.priority}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{channel.reach}</p>
        </div>
        <a
          href={channel.href}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noreferrer"}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Open
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mode</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-gray-900">
            {modeIcon[channel.mode]}
            {channel.mode}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Why test it</p>
          <p className="mt-1 text-sm text-gray-700">{channel.why}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Current view
          </p>
          <p className="mt-1 text-sm text-gray-700">{channel.status}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Wire-up path</p>
        <p className="mt-1 text-sm text-gray-700">{channel.wireUp}</p>
      </div>
    </article>
  );
}

export default function AdminOrbitJobPostingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orange-500">Annix Orbit — Job Posting</h1>
        <p className="mt-1 text-orange-400">
          Free distribution channels to test for Orbit Company jobs before any paid or partner-gated
          boards are wired up.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Recommended first</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">Google + Orbit feed</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Free channels listed</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{channels.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Automation rule</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">Feed first</p>
        </div>
      </div>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-emerald-900">Recommended build order</h2>
            <p className="mt-1 text-sm text-emerald-800">
              Make Orbit the master job source, publish every active company job to a public SEO
              page, expose the XML feed, notify Google, then add assisted/free-board packs while
              feed partners are being approved.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {channels.map((channel) => (
          <ChannelCard key={channel.name} channel={channel} />
        ))}
      </div>
    </div>
  );
}
