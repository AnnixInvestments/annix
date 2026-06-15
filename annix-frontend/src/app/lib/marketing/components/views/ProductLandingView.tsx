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
  CheckCircle2,
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
import { SeekerEarlyAccessModal } from "../SeekerEarlyAccessModal";
import { DEFAULT_PRODUCT_HERO_IMAGE, type ProductLandingConfig } from "./productLandingData";

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

const CARD_ACCENTS = [
  { ring: "bg-indigo-500/15 text-indigo-300", check: "text-indigo-300" },
  { ring: "bg-orange-500/15 text-orange-300", check: "text-orange-300" },
  { ring: "bg-emerald-500/15 text-emerald-300", check: "text-emerald-300" },
  { ring: "bg-violet-500/15 text-violet-300", check: "text-violet-300" },
];

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
  const cfgHero = config.heroImage;
  const propHero = props.heroImageUrl;
  const heroImage = cfgHero ? cfgHero : propHero ? propHero : DEFAULT_PRODUCT_HERO_IMAGE;
  const bottomImageUrl = props.bottomImageUrl ? props.bottomImageUrl : "";
  return (
    <div className="relative overflow-hidden bg-[#0a1733]">
      {bottomImageUrl ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[24rem]">
            <img src={bottomImageUrl} alt="" className="h-full w-full object-cover object-bottom" />
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-[24rem]"
            style={{ backgroundImage: "linear-gradient(0deg, transparent 0%, #0a1733 78%)" }}
          />
        </>
      ) : null}
      <div className="relative">
        <Hero config={config} heroImage={heroImage} />
        <ModuleCards config={config} />
        <StatsBand config={config} />
        <WhySection config={config} />
        <CtaBand config={config} />
      </div>
    </div>
  );
}

function Hero(props: { config: ProductLandingConfig; heroImage: string }) {
  const config = props.config;
  const heroImage = props.heroImage;
  const primaryHref = config.primaryCtaHref ? config.primaryCtaHref : "/contact";
  const secondaryHref = config.secondaryCtaHref ? config.secondaryCtaHref : "/contact";
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pt-32">
      {heroImage ? (
        <>
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt=""
              fetchPriority="high"
              className="h-full w-full object-cover object-right"
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #0a1733 0%, color-mix(in srgb, #0a1733 55%, transparent) 42%, transparent 78%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-24"
            style={{ backgroundImage: "linear-gradient(180deg, transparent, #0a1733)" }}
          />
        </>
      ) : null}

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: "var(--brand-accent)" }}
          >
            {config.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            {config.headlineLead}{" "}
            <span style={{ color: "var(--brand-accent)" }}>{config.headlineEmphasis}</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-white/70 sm:text-lg">{config.subheading}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              {config.primaryCta} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {config.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleCards(props: { config: ProductLandingConfig }) {
  const config = props.config;
  const portals = config.portals;
  const hasPortals = portals.length > 0;
  if (portals.length === 0 && config.cards.length === 0) {
    return null;
  }
  const eyebrow = config.modulesEyebrow ? config.modulesEyebrow : config.gridTitle;
  const lead = config.modulesHeadlineLead ? config.modulesHeadlineLead : "Built for";
  const emphasis = config.modulesHeadlineEmphasis ? config.modulesHeadlineEmphasis : "every need";
  const portalCols =
    portals.length === 2
      ? "lg:grid-cols-2"
      : portals.length === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-4";
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p
          className="text-center text-xs font-semibold uppercase tracking-[0.25em]"
          style={{ color: "var(--brand-accent)" }}
        >
          {eyebrow}
        </p>
        <h2
          className="mt-3 text-center text-2xl font-bold text-white sm:text-4xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          {lead} <span className="text-violet-300">{emphasis}</span>
        </h2>

        {hasPortals ? (
          <div className={`mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 ${portalCols}`}>
            {portals.map((portal, index) => {
              const Icon = resolveIcon(portal.iconKey);
              const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
              const features = portal.features ? portal.features : [];
              const tagline = portal.tagline ? portal.tagline : portal.badge;
              return (
                <div
                  key={portal.name}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${accent.ring}`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-white">{portal.name}</h3>
                  <p className="mt-2 text-sm font-medium text-white/80">{tagline}</p>
                  <p className="mt-3 text-sm text-white/55">{portal.blurb}</p>
                  {features.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent.check}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {portal.earlyAccessCta ? (
                    <div
                      className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2"
                      style={{ color: "var(--brand-accent)" }}
                    >
                      <SeekerEarlyAccessModal triggerClassName="inline-flex items-center gap-1" />
                    </div>
                  ) : (
                    <Link
                      href="/contact"
                      className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2"
                      style={{ color: "var(--brand-accent)" }}
                    >
                      Learn more <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {config.cards.map((card, index) => {
              const Icon = resolveIcon(card.iconKey);
              const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
              return (
                <div
                  key={card.title}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${accent.ring}`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-white/55">{card.blurb}</p>
                  <Link
                    href="/contact"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    Learn more <ArrowRight className="h-4 w-4" />
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

function StatsBand(props: { config: ProductLandingConfig }) {
  const config = props.config;
  if (config.heroStats.length === 0) {
    return null;
  }
  return (
    <section className="px-4 pb-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-8 lg:grid-cols-4">
        {config.heroStats.map((stat) => {
          const iconKey = stat.iconKey ? stat.iconKey : "chart";
          const Icon = resolveIcon(iconKey);
          return (
            <div key={stat.label} className="flex items-center gap-3">
              <span style={{ color: "var(--brand-accent)" }}>
                <Icon className="h-7 w-7" />
              </span>
              <span>
                <span className="block text-2xl font-bold text-white">{stat.value}</span>
                <span className="block text-xs text-white/55">{stat.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WhySection(props: { config: ProductLandingConfig }) {
  const config = props.config;
  const eyebrow = config.whyEyebrow ? config.whyEyebrow : `Why Annix ${config.wordmark}?`;
  const lead = config.whyHeadlineLead ? config.whyHeadlineLead : "AI-Powered. Human Focused.";
  const emphasis = config.whyHeadlineEmphasis ? config.whyHeadlineEmphasis : "Results Driven.";
  const body = config.whyBody ? config.whyBody : config.subheading;
  const ctaLabel = config.whyCta ? config.whyCta : "Explore Platform";
  const ctaHref = config.whyCtaHref ? config.whyCtaHref : "/contact";
  const whyFeatures = config.whyFeatures ? config.whyFeatures : [];
  const feats = whyFeatures.length > 0 ? whyFeatures : config.features;
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
          style={{
            backgroundImage:
              "radial-gradient(120% 120% at 100% 50%, rgba(124,58,237,0.28), transparent 60%)",
          }}
        />
        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-white/50">{eyebrow}</p>
            <h2
              className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl"
              style={{ fontFamily: "var(--brand-font-display)" }}
            >
              {lead} <span style={{ color: "var(--brand-accent)" }}>{emphasis}</span>
            </h2>
            <p className="mt-5 max-w-md text-sm text-white/70">{body}</p>
            <Link
              href={ctaHref}
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {feats.map((feature) => {
              const Icon = resolveIcon(feature.iconKey);
              return (
                <div key={feature.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{feature.title}</span>
                    <span className="block text-xs text-white/55">{feature.blurb}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBand(props: { config: ProductLandingConfig }) {
  const config = props.config;
  const primaryHref = config.primaryCtaHref ? config.primaryCtaHref : "/contact";
  return (
    <section className="px-4 pb-20 pt-2 sm:px-6 lg:px-8">
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
            href={primaryHref}
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
