export interface MarketingCta {
  label: string;
  href: string;
}

export interface MarketingSite {
  logoUrl: string | null;
  wordmarkImageUrl: string | null;
  wordmark: string;
  accentColor: string;
}

export interface MarketingHighlight {
  iconSlot: string;
  title: string;
  subtitle: string;
}

export interface MarketingHero {
  eyebrow: string;
  headlineLead: string;
  headlineEmphasis: string;
  subheading: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta;
  highlights: MarketingHighlight[];
  imageUrl: string | null;
  globalReachTitle: string;
  globalReachBody: string;
}

export interface MarketingProduct {
  appKey: string;
  portalCode: string | null;
  name: string;
  category: string;
  blurb: string;
  iconSlot: string;
  imageUrl: string | null;
  comingSoon: boolean;
  detailSlug: string;
}

export interface MarketingEcosystem {
  eyebrow: string;
  heading: string;
  subheading: string;
  products: MarketingProduct[];
}

export interface MarketingIndustry {
  name: string;
  blurb: string;
  iconSlot: string;
  imageUrl: string | null;
  slug: string;
}

export interface MarketingIndustries {
  eyebrow: string;
  heading: string;
  subheading: string;
  ctaLabel: string;
  items: MarketingIndustry[];
}

export interface MarketingPartner {
  name: string;
  logoUrl: string;
  url: string;
}

export interface MarketingPartners {
  heading: string;
  partners: MarketingPartner[];
}

export interface MarketingPresenceItem {
  region: string;
  label: string;
  detail: string;
  flag: string;
}

export interface MarketingGlobalPresence {
  heading: string;
  items: MarketingPresenceItem[];
}

export interface MarketingCtaBand {
  headline: string;
  subheading: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta;
  backgroundImageUrl: string | null;
}

export interface MarketingSocialLink {
  platform: string;
  href: string;
}

export interface MarketingFooterColumn {
  heading: string;
  links: MarketingCta[];
}

export interface MarketingFooter {
  tagline: string;
  columns: MarketingFooterColumn[];
  newsletterHeading: string;
  newsletterBody: string;
  socialLinks: MarketingSocialLink[];
  legalLinks: MarketingCta[];
  legal: string;
  designedByLogoUrl: string | null;
  designedByUrl: string;
  hostedByLogoUrl: string | null;
  hostedByUrl: string;
}

export interface MarketingProductFeature {
  title: string;
  blurb: string;
  iconSlot: string;
}

export interface MarketingProductRoi {
  metric: string;
  label: string;
}

export interface MarketingProductPage {
  slug: string;
  appKey: string;
  portalCode: string | null;
  name: string;
  headline: string;
  subheading: string;
  problem: string;
  features: MarketingProductFeature[];
  industries: string[];
  roi: MarketingProductRoi[];
}

export interface MarketingLabsItem {
  name: string;
  blurb: string;
  status: string;
}

export interface MarketingLabs {
  heading: string;
  subheading: string;
  items: MarketingLabsItem[];
}

export interface MarketingAboutValue {
  title: string;
  body: string;
}

export interface MarketingAbout {
  heading: string;
  body: string;
  leadImageUrl: string | null;
  storyHeading: string;
  storyBody: string;
  storyImageUrl: string | null;
  values: MarketingAboutValue[];
  mission: string;
  missionImageUrl: string | null;
}

export const RESOURCE_CATEGORIES = [
  "Guides & Playbooks",
  "Standards & Compliance",
  "Industry Briefs",
  "Platform",
  "Developers",
  "Trust & Security",
] as const;

export type MarketingResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export interface MarketingResource {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  imageUrl: string | null;
  productSlug: string;
  published: boolean;
}

export interface MarketingResources {
  heading: string;
  subheading: string;
  items: MarketingResource[];
}

export interface MarketingSiteContent {
  site: MarketingSite;
  hero: MarketingHero;
  ecosystem: MarketingEcosystem;
  industries: MarketingIndustries;
  partners: MarketingPartners;
  globalPresence: MarketingGlobalPresence;
  ctaBand: MarketingCtaBand;
  footer: MarketingFooter;
  productPages: MarketingProductPage[];
  labs: MarketingLabs;
  about: MarketingAbout;
  resources: MarketingResources;
}

export interface MarketingSiteStatus {
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
}
