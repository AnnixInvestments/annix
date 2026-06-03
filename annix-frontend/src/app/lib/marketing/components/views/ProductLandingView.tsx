import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  Ban,
  BarChart3,
  Boxes,
  Brain,
  Briefcase,
  Building2,
  Calculator,
  CircleDot,
  ClipboardList,
  Clock,
  Cloud,
  Cpu,
  Cylinder,
  DollarSign,
  Download,
  Droplets,
  Eye,
  FilePlus,
  FileText,
  Flame,
  GraduationCap,
  HardHat,
  Layers,
  List,
  Lock,
  type LucideIcon,
  Receipt,
  RefreshCw,
  Route,
  Scale,
  Shield,
  ShieldCheck,
  Signal,
  Sparkles,
  Star,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ProductLandingConfig } from "./productLandingData";

const ICONS: Record<string, LucideIcon> = {
  filePlus: FilePlus,
  list: List,
  users: Users,
  receipt: Receipt,
  shield: Shield,
  chart: BarChart3,
  hardHat: HardHat,
  shieldCheck: ShieldCheck,
  flange: CircleDot,
  pipe: Cylinder,
  droplet: Droplets,
  pvc: Boxes,
  weld: Flame,
  layers: Layers,
  activity: Activity,
  clipboard: ClipboardList,
  lock: Lock,
  alert: AlertTriangle,
  calculator: Calculator,
  building: Building2,
  brain: Brain,
  award: Award,
  leaf: Sparkles,
  scale: Scale,
  file: FileText,
  user: User,
  briefcase: Briefcase,
  graduation: GraduationCap,
  refresh: RefreshCw,
  signal: Signal,
  cpu: Cpu,
  clock: Clock,
  star: Star,
  download: Download,
  ban: Ban,
  route: Route,
  cloud: Cloud,
  dollar: DollarSign,
  eye: Eye,
};

function resolveIcon(key: string): LucideIcon {
  if (key in ICONS) {
    return ICONS[key];
  }
  return Sparkles;
}

export function ProductLandingView(props: {
  config: ProductLandingConfig;
  heroImageUrl: string | null;
  bottomImageUrl: string | null;
}) {
  const config = props.config;
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
        <Hero config={config} />
        <FeatureRow config={config} />
        <Grid config={config} />
        <Strip config={config} />
        <TrustedBy />
        <CtaBand config={config} />
      </div>
    </div>
  );
}

function Hero(props: { config: ProductLandingConfig }) {
  const config = props.config;
  return (
    <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <p
            className="text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--brand-accent)" }}
          >
            {config.eyebrow}
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            {config.headlineLead}{" "}
            <span style={{ color: "var(--brand-accent)" }}>{config.headlineEmphasis}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">{config.subheading}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              {config.primaryCta} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {config.secondaryCta}
            </Link>
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Annix {config.wordmark}</span>
            <span className="text-xs text-white/40">Dashboard</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {config.heroStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/40">
                  {stat.label}
                </div>
                <div className="mt-1 text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[11px]" style={{ color: "#3ec97a" }}>
                  {stat.delta}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow(props: { config: ProductLandingConfig }) {
  const config = props.config;
  return (
    <section className="border-y border-white/10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-8">
        {config.features.map((feature) => {
          const Icon = resolveIcon(feature.iconKey);
          return (
            <div key={feature.title} className="flex min-w-[150px] flex-1 flex-col gap-2">
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

function Grid(props: { config: ProductLandingConfig }) {
  const config = props.config;
  const isPortals = config.gridKind === "portals";
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p
          className="text-center text-xs font-semibold uppercase tracking-[0.25em]"
          style={{ color: "var(--brand-accent)" }}
        >
          {config.gridTitle}
        </p>
        {isPortals ? (
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {config.portals.map((portal) => {
              const Icon = resolveIcon(portal.iconKey);
              return (
                <div
                  key={portal.name}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--brand-accent) 18%, transparent)",
                        color: "var(--brand-accent)",
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--brand-accent) 14%, transparent)",
                        color: "var(--brand-accent)",
                      }}
                    >
                      {portal.badge}
                    </span>
                  </div>
                  <span className="mt-3 text-base font-semibold text-white">{portal.name}</span>
                  <span className="mt-2 flex-1 text-sm text-white/55">{portal.blurb}</span>
                  <Link
                    href="/contact"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold transition hover:gap-2"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    Explore <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {config.cards.map((card) => {
              const Icon = resolveIcon(card.iconKey);
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
        )}
      </div>
    </section>
  );
}

function Strip(props: { config: ProductLandingConfig }) {
  const config = props.config;
  return (
    <section className="border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p
          className="text-center text-xs font-semibold uppercase tracking-[0.25em]"
          style={{ color: "var(--brand-accent)" }}
        >
          {config.stripTitle}
        </p>
        <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {config.strip.map((item) => {
            const Icon = resolveIcon(item.iconKey);
            return (
              <div key={`${item.title}-${item.subtitle}`} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/70"
                  style={{ color: "var(--brand-accent)" }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold text-white">{item.title}</span>
                  <span className="block text-xs text-white/50">{item.subtitle}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustedBy() {
  return (
    <section className="border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
          Trusted by industry leaders
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

function CtaBand(props: { config: ProductLandingConfig }) {
  const config = props.config;
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
            {config.ctaHeadline}
          </h3>
          <p className="mt-2 max-w-xl text-sm text-white/70">{config.ctaBody}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            {config.ctaPrimary} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className="text-sm font-semibold text-white underline-offset-4 hover:underline"
          >
            {config.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
