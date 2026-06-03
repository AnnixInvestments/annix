import {
  AppWindow,
  ArrowRight,
  Ban,
  BarChart3,
  CalendarDays,
  Headphones,
  MapPin,
  Mic,
  MonitorSmartphone,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

type IconType = ComponentType<{ className?: string }>;

const FEATURE_ROW: { icon: IconType; title: string; blurb: string }[] = [
  { icon: Search, title: "Find Prospects", blurb: "Discover and qualify prospects near you." },
  {
    icon: CalendarDays,
    title: "Plan & Schedule",
    blurb: "Smart calendar with route planning and travel time.",
  },
  { icon: Mic, title: "Run Meetings", blurb: "Record, transcribe, and summarize every meeting." },
  {
    icon: TrendingUp,
    title: "Track Pipeline",
    blurb: "Real-time pipeline and performance analytics.",
  },
  { icon: Target, title: "Hit Goals", blurb: "Set goals, track progress, and win more deals." },
  {
    icon: RefreshCw,
    title: "Seamless Integrations",
    blurb: "CRM, calendars, meeting apps and more.",
  },
];

const PLATFORM_CARDS: { icon: IconType; title: string; blurb: string }[] = [
  {
    icon: Users,
    title: "Prospecting & Discovery",
    blurb: "Location-based discovery, prospect pipeline, activity logs and custom fields.",
  },
  {
    icon: CalendarDays,
    title: "Meetings & Schedule",
    blurb: "Schedule meetings, plan routes, track visits and manage recurring meetings.",
  },
  {
    icon: CalendarDays,
    title: "Calendar Integration",
    blurb: "Sync Google, Outlook, CalDAV and Zoom calendars with conflict resolution.",
  },
  {
    icon: Mic,
    title: "AI Meeting Intelligence",
    blurb: "Real-time transcription, speaker identification and AI-generated summaries.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    blurb: "Pipeline analytics, forecasts, territory maps, goals and custom reports.",
  },
  {
    icon: Plug,
    title: "Integrations",
    blurb: "Two-way CRM sync, meeting platforms and Microsoft Teams bot.",
  },
  {
    icon: Users,
    title: "Team & Management",
    blurb: "Manage teams, territories, roles, and track team performance.",
  },
];

const VOICE_FILTER_BENEFITS: { icon: IconType; text: string }[] = [
  { icon: ShieldCheck, text: "Real-time voice verification using AWS Voice ID" },
  { icon: Ban, text: "Blocks unknown voices from reaching other apps" },
  { icon: AppWindow, text: "Works with Teams, Zoom, Dictation, Docs & more" },
  { icon: MonitorSmartphone, text: "Desktop agent with secure local processing" },
];

const PIPELINE_STATS: { label: string; value: string; delta: string }[] = [
  { label: "Pipeline Value", value: "R 24.8M", delta: "+18% vs last month" },
  { label: "Win Rate", value: "32%", delta: "+6% vs last month" },
  { label: "Meetings This Week", value: "28", delta: "+12% vs last week" },
  { label: "New Prospects", value: "156", delta: "+24% vs last week" },
];

const FUNNEL = [
  { label: "New", width: "100%", color: "#2f6df6" },
  { label: "Contacted", width: "82%", color: "#3f8efc" },
  { label: "Qualified", width: "64%", color: "#f5821f" },
  { label: "Proposal", width: "44%", color: "#f5a623" },
  { label: "Won", width: "26%", color: "#3ec97a" },
];

function PulseHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <p
            className="text-sm font-semibold uppercase tracking-[0.25em]"
            style={{ color: "var(--brand-accent)" }}
          >
            Discover · Connect · Analyze · Win
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Transform conversations into{" "}
            <span style={{ color: "var(--brand-accent)" }}>customers.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">
            Annix Pulse is the mobile-first sales field assistant that helps reps find prospects,
            run smarter meetings, capture insights, and drive more wins.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              Explore Pulse <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Book a Demo
            </Link>
          </div>
        </div>

        <PulseDashboardMock />
      </div>
    </section>
  );
}

function PulseDashboardMock() {
  return (
    <div className="relative">
      <svg
        className="absolute inset-x-0 -bottom-6 h-24 w-full opacity-60"
        viewBox="0 0 600 80"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 40 H180 l20 -28 l18 56 l16 -64 l16 64 l14 -28 H600"
          stroke="var(--brand-accent)"
          strokeWidth="2.5"
        />
      </svg>

      <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Pipeline Overview</span>
          <span className="text-xs text-white/40">John Smith · Field Sales Rep</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {PIPELINE_STATS.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/40">{stat.label}</div>
              <div className="mt-1 text-xl font-bold text-white">{stat.value}</div>
              <div className="text-[11px]" style={{ color: "#3ec97a" }}>
                {stat.delta}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40">Pipeline Funnel</div>
          <div className="mt-3 space-y-1.5">
            {FUNNEL.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[11px] text-white/50">{row.label}</span>
                <span
                  className="h-4 rounded-sm"
                  style={{ width: row.width, backgroundColor: row.color }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 right-2 hidden w-28 rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-2xl sm:block">
        <div className="text-[10px] uppercase tracking-wide text-white/40">Nearby</div>
        <div className="mt-2 space-y-2">
          {["Acme Corporation", "BlueWave Solutions", "Global Supplies"].map((name) => (
            <div key={name} className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" style={{ color: "var(--brand-accent)" }} />
              <span className="truncate text-[10px] text-white/60">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PulseFeatureRow() {
  return (
    <section className="border-y border-white/10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
        {FEATURE_ROW.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="flex flex-col gap-2">
              <span style={{ color: "var(--brand-accent)" }}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-white">{feature.title}</span>
              <span className="text-xs text-white/50">{feature.blurb}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PulsePlatformGrid() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p
          className="text-center text-xs font-semibold uppercase tracking-[0.25em]"
          style={{ color: "var(--brand-accent)" }}
        >
          The Annix Pulse Platform
        </p>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {PLATFORM_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <span style={{ color: "var(--brand-accent)" }}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="mt-3 text-sm font-semibold text-white">{card.title}</span>
                <span className="mt-2 flex-1 text-xs text-white/55">{card.blurb}</span>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold transition hover:gap-2"
                  style={{ color: "var(--brand-accent)" }}
                >
                  Learn more <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PulseVoiceFilter() {
  return (
    <section className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4" style={{ color: "var(--brand-accent)" }} />
          <span
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: "var(--brand-accent)" }}
          >
            Voice Filter
          </span>
        </div>
        <h2
          className="mt-4 max-w-md text-3xl font-bold text-white sm:text-4xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          Only authorized voices get through.
        </h2>
        <p className="mt-4 max-w-md text-sm text-white/60">
          Annix Pulse Voice Filter verifies speakers in real-time and lets only authorized voices
          pass through to any app. Single speaker or multi-speaker meeting mode.
        </p>
        <Link
          href="/contact"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold transition hover:gap-3"
          style={{ color: "var(--brand-accent)" }}
        >
          Learn more about Voice Filter <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Headphones className="h-3.5 w-3.5" /> Voice Filter
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/40">Filter Status</div>
              <div className="mt-1 text-lg font-bold" style={{ color: "#3ec97a" }}>
                ACTIVE
              </div>
              <div className="text-[11px] text-white/50">Authorized voice detected</div>
            </div>
            <div className="mt-3 space-y-2">
              {["Speaker 1 · 02:35", "Speaker 2 · 01:48", "Speaker 3 · 01:12"].map((speaker) => (
                <div
                  key={speaker}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60"
                >
                  <span>{speaker}</span>
                  <span style={{ color: "var(--brand-accent)" }}>▮▮▮</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="space-y-4">
            {VOICE_FILTER_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <li key={benefit.text} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--brand-accent) 18%, transparent)",
                      color: "var(--brand-accent)",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-white/70">{benefit.text}</span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wide text-white/40">Your voice</div>
              <Mic className="mx-auto mt-2 h-7 w-7" style={{ color: "var(--brand-accent)" }} />
            </div>
            <ArrowRight className="h-5 w-5 text-white/30" />
            <div className="text-center">
              <ShieldCheck className="mx-auto h-8 w-8" style={{ color: "var(--brand-accent)" }} />
              <div className="mt-2 text-[11px] text-white/50">
                Verified
                <br />
                Authorized
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/30" />
            <div className="text-center">
              <AppWindow className="mx-auto h-7 w-7 text-white/70" />
              <div className="mt-2 text-[11px] text-white/40">Any app</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PulseTrustedBy() {
  return (
    <section className="border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
          Trusted by sales teams worldwide
        </p>
        <div className="mt-6 grid grid-cols-3 items-center gap-6 sm:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => index).map((index) => (
            <div
              key={`logo-${index}`}
              className="flex h-10 items-center justify-center rounded-lg border border-dashed border-white/10 text-[10px] text-white/25"
            >
              Logo
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/30">
          Add customer logos in the CMS — only those you have permission to display.
        </p>
      </div>
    </section>
  );
}

function PulseCtaBand() {
  return (
    <section className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <div
        className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 p-8 sm:flex-row sm:items-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-accent) 16%, transparent), rgba(56,90,170,0.18))",
        }}
      >
        <div>
          <h3
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            Ready to transform your sales conversations?
          </h3>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            See how Annix Pulse can help your team discover more, connect better and win more.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            Book a Demo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className="text-sm font-semibold text-white underline-offset-4 hover:underline"
          >
            or Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PulseLandingView(props: {
  heroImageUrl: string | null;
  bottomImageUrl: string | null;
}) {
  const heroImageUrl = props.heroImageUrl ? props.heroImageUrl : "";
  const bottomImageUrl = props.bottomImageUrl ? props.bottomImageUrl : "";
  return (
    <div className="relative overflow-hidden bg-[#0a1733]">
      {heroImageUrl ? (
        <>
          <div className="absolute inset-x-0 top-0 h-[28rem]">
            <img src={heroImageUrl} alt="" className="h-full w-full object-cover object-top" />
          </div>
          <div
            className="absolute inset-x-0 top-0 h-[28rem]"
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
      <div className="relative">
        <PulseHero />
        <PulseFeatureRow />
        <PulsePlatformGrid />
        <PulseVoiceFilter />
        <PulseTrustedBy />
        <PulseCtaBand />
      </div>
    </div>
  );
}
