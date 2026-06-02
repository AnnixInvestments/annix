export interface MarketingCta {
  label: string;
  href: string;
}

export interface MarketingStat {
  value: string;
  label: string;
}

export interface MarketingHero {
  eyebrow: string;
  headlineLead: string;
  headlineEmphasis: string;
  subheading: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta;
  stats: MarketingStat[];
}

export interface MarketingProduct {
  appKey: string;
  portalCode: string | null;
  name: string;
  category: string;
  blurb: string;
  iconSlot: string;
  comingSoon: boolean;
  detailSlug: string;
}

export interface MarketingEcosystem {
  heading: string;
  subheading: string;
  products: MarketingProduct[];
}

export interface MarketingIndustry {
  name: string;
  blurb: string;
  iconSlot: string;
  slug: string;
}

export interface MarketingIndustries {
  heading: string;
  subheading: string;
  items: MarketingIndustry[];
}

export interface MarketingTrustBar {
  heading: string;
  regions: string[];
}

export interface MarketingCtaBand {
  headline: string;
  subheading: string;
  primaryCta: MarketingCta;
  secondaryCta: MarketingCta;
}

export interface MarketingFooterColumn {
  heading: string;
  links: MarketingCta[];
}

export interface MarketingFooter {
  tagline: string;
  columns: MarketingFooterColumn[];
  legal: string;
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
  values: MarketingAboutValue[];
}

export interface MarketingSiteContent {
  hero: MarketingHero;
  ecosystem: MarketingEcosystem;
  industries: MarketingIndustries;
  trustBar: MarketingTrustBar;
  ctaBand: MarketingCtaBand;
  footer: MarketingFooter;
  productPages: MarketingProductPage[];
  labs: MarketingLabs;
  about: MarketingAbout;
}

export interface MarketingSiteStatus {
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
}
