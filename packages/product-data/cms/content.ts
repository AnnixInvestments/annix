export interface CmsLink {
  label: string;
  href: string;
}

export interface CmsImage {
  url: string;
  alt: string;
}

export interface RichTextBlock {
  type: "richText";
  markdown: string;
}

export interface HeroBlock {
  type: "hero";
  eyebrow: string;
  headline: string;
  subheading: string;
  imageUrl: string | null;
  primaryCta: CmsLink | null;
  secondaryCta: CmsLink | null;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqBlock {
  type: "faq";
  heading: string;
  items: FaqItem[];
}

export interface FeatureItem {
  title: string;
  blurb: string;
  href: string | null;
  imageUrl: string | null;
}

export interface FeatureGridBlock {
  type: "featureGrid";
  heading: string;
  subheading: string;
  items: FeatureItem[];
}

export interface CtaBandBlock {
  type: "ctaBand";
  headline: string;
  subheading: string;
  primaryCta: CmsLink | null;
  secondaryCta: CmsLink | null;
}

export interface GalleryBlock {
  type: "gallery";
  heading: string;
  images: CmsImage[];
}

export interface RelatedItem {
  title: string;
  description: string;
  href: string;
}

export interface RelatedSolutionsBlock {
  type: "relatedSolutions";
  heading: string;
  items: RelatedItem[];
}

export interface TrustBadge {
  title: string;
  subtitle: string;
}

export interface TrustBadgesBlock {
  type: "trustBadges";
  items: TrustBadge[];
}

export interface TwoColumnBlock {
  type: "twoColumn";
  heading: string;
  body: string;
  imageUrl: string | null;
  imageRight: boolean;
}

export interface CaseStudyStripBlock {
  type: "caseStudyStrip";
  heading: string;
  serviceSlug: string | null;
  limit: number;
}

export type CmsBlock =
  | RichTextBlock
  | HeroBlock
  | FaqBlock
  | FeatureGridBlock
  | CtaBandBlock
  | GalleryBlock
  | RelatedSolutionsBlock
  | TrustBadgesBlock
  | TwoColumnBlock
  | CaseStudyStripBlock;

export type CmsBlockType = CmsBlock["type"];

export interface CmsBlockTypeMeta {
  type: CmsBlockType;
  label: string;
  description: string;
}

export const CMS_BLOCK_TYPES: CmsBlockTypeMeta[] = [
  { type: "hero", label: "Hero", description: "Full-width banner with headline and CTAs" },
  { type: "richText", label: "Rich Text", description: "Markdown prose section" },
  {
    type: "featureGrid",
    label: "Feature Grid",
    description: "Grid of cards with title, blurb, and link",
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Question/answer accordion (emits FAQ structured data)",
  },
  { type: "ctaBand", label: "CTA Band", description: "Call-to-action strip with buttons" },
  { type: "gallery", label: "Gallery", description: "Grid of images" },
  {
    type: "caseStudyStrip",
    label: "Case Study Strip",
    description: "Auto-selected related project case studies",
  },
  {
    type: "relatedSolutions",
    label: "Related Solutions",
    description: "Cross-link cards to other pages",
  },
  { type: "trustBadges", label: "Trust Badges", description: "Row of short credibility badges" },
  { type: "twoColumn", label: "Two Column", description: "Text alongside an image" },
];

export function defaultBlock(type: CmsBlockType): CmsBlock {
  if (type === "hero") {
    return {
      type: "hero",
      eyebrow: "",
      headline: "",
      subheading: "",
      imageUrl: null,
      primaryCta: null,
      secondaryCta: null,
    };
  }
  if (type === "richText") {
    return { type: "richText", markdown: "" };
  }
  if (type === "featureGrid") {
    return { type: "featureGrid", heading: "", subheading: "", items: [] };
  }
  if (type === "faq") {
    return { type: "faq", heading: "Frequently Asked Questions", items: [] };
  }
  if (type === "ctaBand") {
    return {
      type: "ctaBand",
      headline: "",
      subheading: "",
      primaryCta: null,
      secondaryCta: null,
    };
  }
  if (type === "gallery") {
    return { type: "gallery", heading: "", images: [] };
  }
  if (type === "caseStudyStrip") {
    return { type: "caseStudyStrip", heading: "Recent Projects", serviceSlug: null, limit: 3 };
  }
  if (type === "relatedSolutions") {
    return { type: "relatedSolutions", heading: "Related Solutions", items: [] };
  }
  if (type === "trustBadges") {
    return { type: "trustBadges", items: [] };
  }
  return { type: "twoColumn", heading: "", body: "", imageUrl: null, imageRight: false };
}

export function blockTypeLabel(type: CmsBlockType): string {
  const match = CMS_BLOCK_TYPES.find((entry) => entry.type === type);
  return match ? match.label : type;
}
