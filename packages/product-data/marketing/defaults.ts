import type { MarketingProduct, MarketingProductPage, MarketingSiteContent } from "./content";

const ECOSYSTEM_PRODUCTS: MarketingProduct[] = [
  {
    appKey: "annix-core",
    portalCode: "stock-control",
    name: "Annix Core",
    category: "Industrial Operations",
    blurb:
      "Streamline operations, inventory, production and supplier management with quality certificates built in.",
    iconSlot: "Boxes",
    imageUrl: null,
    comingSoon: false,
    detailSlug: "annix-core",
  },
  {
    appKey: "annix-forge",
    portalCode: "rfq",
    name: "Annix Forge",
    category: "Engineering & Procurement",
    blurb:
      "RFQ, bills of quantity and weld-aware quoting built around ASME, API and NACE engineering standards.",
    iconSlot: "Hammer",
    imageUrl: null,
    comingSoon: false,
    detailSlug: "annix-forge",
  },
  {
    appKey: "annix-orbit",
    portalCode: "annix-orbit",
    name: "Annix Orbit",
    category: "Workforce & Recruitment",
    blurb:
      "Attract, screen and place the right talent faster with AI-powered recruitment and a live job market.",
    iconSlot: "Orbit",
    imageUrl: null,
    comingSoon: false,
    detailSlug: "annix-orbit",
  },
  {
    appKey: "annix-rep",
    portalCode: "annix-rep",
    name: "Annix Pulse",
    category: "Field Operations",
    blurb:
      "Empower field teams and sales reps with routes, real-time data and voice-driven activity capture.",
    iconSlot: "Radio",
    imageUrl: null,
    comingSoon: false,
    detailSlug: "annix-pulse",
  },
  {
    appKey: "annix-sentinel",
    portalCode: "annix-sentinel",
    name: "Annix Sentinel",
    category: "Compliance & Governance",
    blurb:
      "Ensure compliance, manage risk and keep your business audit-ready with secure document workflows.",
    iconSlot: "ShieldCheck",
    imageUrl: null,
    comingSoon: false,
    detailSlug: "annix-sentinel",
  },
  {
    appKey: "insights",
    portalCode: "insights",
    name: "Annix Insights",
    category: "Financial Intelligence",
    blurb:
      "Gain insight, track performance and make smarter decisions with cross-product reporting.",
    iconSlot: "LineChart",
    imageUrl: null,
    comingSoon: false,
    detailSlug: "annix-insights",
  },
  {
    appKey: "annix-investments",
    portalCode: null,
    name: "Annix Labs",
    category: "What's Next",
    blurb:
      "Where we build what's next — custom apps for our own portfolio and for clients, on the same shared Annix platform.",
    iconSlot: "Sparkles",
    imageUrl: null,
    comingSoon: true,
    detailSlug: "annix-labs",
  },
];

const PRODUCT_PAGES: MarketingProductPage[] = [
  {
    slug: "annix-core",
    appKey: "annix-core",
    portalCode: "stock-control",
    name: "Annix Core",
    headline: "Industrial operations, under control.",
    subheading:
      "Stock, quality and inventory intelligence in one place — so your floor always knows what it has and what it is certified to do.",
    problem:
      "Spreadsheets, paper certificates and disconnected systems make it impossible to trust your stock numbers or prove material traceability when it matters.",
    features: [
      {
        title: "Real-time stock control",
        blurb: "Track inventory, locations and movements with a single source of truth.",
        iconSlot: "Boxes",
      },
      {
        title: "Quality certificates",
        blurb: "Capture, extract and verify material certificates with AI assistance.",
        iconSlot: "BadgeCheck",
      },
      {
        title: "Traceability",
        blurb: "Prove material provenance from goods-in to dispatch on demand.",
        iconSlot: "GitBranch",
      },
    ],
    industries: ["Mining", "Manufacturing", "Engineering"],
    roi: [
      { metric: "Single", label: "source of truth for stock" },
      { metric: "Minutes", label: "to verify a certificate" },
      { metric: "Full", label: "material traceability" },
    ],
  },
  {
    slug: "annix-forge",
    appKey: "annix-forge",
    portalCode: "rfq",
    name: "Annix Forge",
    headline: "Quote engineering work with confidence.",
    subheading:
      "RFQ, bills of quantity and weld-aware pricing built around the standards your customers audit against.",
    problem:
      "Manual quoting for piping and fabrication is slow, error-prone and hard to defend when engineering standards are involved.",
    features: [
      {
        title: "Standards-aware quoting",
        blurb: "Pricing that understands ASME, API and NACE engineering requirements.",
        iconSlot: "Ruler",
      },
      {
        title: "Bills of quantity",
        blurb: "Build structured BOQs that feed straight into procurement.",
        iconSlot: "ListChecks",
      },
      {
        title: "Weld calculations",
        blurb: "Weld math and material logic baked into every line item.",
        iconSlot: "Flame",
      },
    ],
    industries: ["Engineering", "Manufacturing", "Mining"],
    roi: [
      { metric: "Faster", label: "turnaround on RFQs" },
      { metric: "Defensible", label: "standards-based pricing" },
      { metric: "Fewer", label: "quoting errors" },
    ],
  },
  {
    slug: "annix-orbit",
    appKey: "annix-orbit",
    portalCode: "annix-orbit",
    name: "Annix Orbit",
    headline: "Where talent and opportunity meet.",
    subheading:
      "A live job market connecting seekers, recruiters and education pathways — with AI that helps everyone move forward.",
    problem:
      "Job seekers struggle to present themselves well and recruiters struggle to find the right people, while education and funding pathways stay disconnected from the job market.",
    features: [
      {
        title: "CV building",
        blurb: "AI-assisted CVs that help seekers stand out.",
        iconSlot: "FileUser",
      },
      {
        title: "Live job market",
        blurb: "Real opportunities matched to real skills.",
        iconSlot: "Briefcase",
      },
      {
        title: "FuturePath",
        blurb: "Education-to-funding pathways that build long-term careers.",
        iconSlot: "Compass",
      },
    ],
    industries: ["Education", "Manufacturing", "Mining"],
    roi: [
      { metric: "Connected", label: "seekers and recruiters" },
      { metric: "Guided", label: "education pathways" },
      { metric: "Live", label: "job market" },
    ],
  },
  {
    slug: "annix-pulse",
    appKey: "annix-rep",
    portalCode: "annix-rep",
    name: "Annix Pulse",
    headline: "Keep your field teams in motion.",
    subheading:
      "Reps, routes and voice-driven activity capture that keep distributed teams moving and accountable.",
    problem:
      "Field activity is invisible until it is too late — routes drift, visits go unlogged and managers fly blind.",
    features: [
      {
        title: "Route planning",
        blurb: "Plan and track field routes that make sense.",
        iconSlot: "Map",
      },
      {
        title: "Voice capture",
        blurb: "Log visits and activity by voice, hands-free.",
        iconSlot: "Mic",
      },
      {
        title: "Live visibility",
        blurb: "See field activity as it happens, not weeks later.",
        iconSlot: "Activity",
      },
    ],
    industries: ["Manufacturing", "Mining"],
    roi: [
      { metric: "Live", label: "field visibility" },
      { metric: "Hands-free", label: "activity capture" },
      { metric: "Accountable", label: "field teams" },
    ],
  },
  {
    slug: "annix-sentinel",
    appKey: "annix-sentinel",
    portalCode: "annix-sentinel",
    name: "Annix Sentinel",
    headline: "Compliance you can prove.",
    subheading:
      "Secure document handling, audit trails and compliance workflows for regulated industrial operations.",
    problem:
      "Regulated operations carry real risk when documents are scattered, access is unclear and audit trails are incomplete.",
    features: [
      {
        title: "Secure documents",
        blurb: "Controlled, auditable handling of sensitive documents.",
        iconSlot: "FileLock",
      },
      {
        title: "Audit trails",
        blurb: "Every action recorded and reviewable.",
        iconSlot: "ScrollText",
      },
      {
        title: "Compliance workflows",
        blurb: "Governance built into how work actually happens.",
        iconSlot: "ShieldCheck",
      },
    ],
    industries: ["Mining", "Engineering", "Manufacturing"],
    roi: [
      { metric: "Auditable", label: "by design" },
      { metric: "Controlled", label: "document access" },
      { metric: "Lower", label: "compliance risk" },
    ],
  },
  {
    slug: "annix-insights",
    appKey: "insights",
    portalCode: "insights",
    name: "Annix Insights",
    headline: "Turn operational data into decisions.",
    subheading:
      "Cross-product reporting and financial intelligence that bring every Annix product into one view.",
    problem:
      "When every product reports separately, leadership never sees the whole picture in time to act on it.",
    features: [
      {
        title: "Cross-product reporting",
        blurb: "One view across the whole Annix ecosystem.",
        iconSlot: "LayoutDashboard",
      },
      {
        title: "Financial intelligence",
        blurb: "Operational data translated into financial insight.",
        iconSlot: "LineChart",
      },
      {
        title: "Decision support",
        blurb: "The numbers leadership needs, when they need them.",
        iconSlot: "TrendingUp",
      },
    ],
    industries: ["Mining", "Manufacturing", "Engineering"],
    roi: [
      { metric: "Unified", label: "reporting" },
      { metric: "Timely", label: "financial insight" },
      { metric: "Confident", label: "decisions" },
    ],
  },
];

export function defaultMarketingContent(): MarketingSiteContent {
  return {
    site: {
      logoUrl: null,
      wordmark: "ANNIX INVESTMENTS",
    },
    hero: {
      eyebrow: "Built in South Africa. Built for the world.",
      headlineLead: "Intelligent software for industries",
      headlineEmphasis: "that move the world.",
      subheading:
        "Annix develops powerful, industry-specific platforms that help businesses recruit better, operate smarter, stay compliant and grow with confidence.",
      primaryCta: { label: "Explore Products", href: "#ecosystem" },
      secondaryCta: { label: "Book a Demo", href: "/contact" },
      highlights: [
        { iconSlot: "Globe", title: "Built in", subtitle: "South Africa" },
        { iconSlot: "ShieldCheck", title: "Enterprise grade", subtitle: "Security" },
        { iconSlot: "Boxes", title: "Scalable", subtitle: "Secure. Reliable." },
        { iconSlot: "LineChart", title: "AI", subtitle: "Built in" },
      ],
      imageUrl: "/marketing/hero-globe.png",
      globalReachTitle: "Global reach. Local excellence.",
      globalReachBody:
        "Headquartered in South Africa, delivering world-class software solutions to businesses across the globe.",
    },
    ecosystem: {
      eyebrow: "The Annix Ecosystem",
      heading: "One platform. Multiple solutions.",
      subheading: "Integrated products that work together. Built for your industry.",
      products: ECOSYSTEM_PRODUCTS,
    },
    industries: {
      eyebrow: "Built for",
      heading: "Every Industry. Anywhere.",
      subheading: "Annix is designed for the realities of heavy, regulated and field-driven work.",
      ctaLabel: "View All Industries",
      items: [
        {
          name: "Mining",
          blurb: "Operations and compliance for the mining sector.",
          iconSlot: "Mountain",
          imageUrl: null,
          slug: "mining",
        },
        {
          name: "Manufacturing",
          blurb: "Stock, quality and field operations for manufacturers.",
          iconSlot: "Factory",
          imageUrl: null,
          slug: "manufacturing",
        },
        {
          name: "Engineering",
          blurb: "Standards-aware quoting and procurement.",
          iconSlot: "Wrench",
          imageUrl: null,
          slug: "engineering",
        },
        {
          name: "Construction",
          blurb: "Built for construction and fabrication teams.",
          iconSlot: "Hammer",
          imageUrl: null,
          slug: "construction",
        },
        {
          name: "Energy",
          blurb: "For energy and resource operations.",
          iconSlot: "Flame",
          imageUrl: null,
          slug: "energy",
        },
        {
          name: "Logistics",
          blurb: "Move goods and teams with confidence.",
          iconSlot: "Map",
          imageUrl: null,
          slug: "logistics",
        },
        {
          name: "Education",
          blurb: "Teaching tools and pathways to careers.",
          iconSlot: "GraduationCap",
          imageUrl: null,
          slug: "education",
        },
      ],
    },
    partners: {
      heading: "Trusted by leading companies around the world",
      partners: [],
    },
    globalPresence: {
      heading: "Global presence, local support",
      items: [
        { region: "South Africa", label: "Head Office", detail: "Cape Town", flag: "🇿🇦" },
        { region: "Australia", label: "Sales Office", detail: "Perth", flag: "🇦🇺" },
        { region: "Europe", label: "Partners", detail: "Across EU", flag: "🇪🇺" },
        { region: "Americas", label: "Partners", detail: "Across USA", flag: "🇺🇸" },
      ],
    },
    ctaBand: {
      headline: "Ready to transform your business?",
      subheading:
        "Book a demo with our team and see how Annix solutions can help you work smarter and grow faster.",
      primaryCta: { label: "Book a Demo", href: "/contact" },
      secondaryCta: { label: "Contact Us", href: "/contact" },
    },
    footer: {
      tagline: "Intelligent software solutions built in South Africa.",
      columns: [
        {
          heading: "Products",
          links: [
            { label: "Annix Core", href: "/products/annix-core" },
            { label: "Annix Forge", href: "/products/annix-forge" },
            { label: "Annix Orbit", href: "/products/annix-orbit" },
            { label: "Annix Sentinel", href: "/products/annix-sentinel" },
          ],
        },
        {
          heading: "Industries",
          links: [
            { label: "Mining", href: "/industries/mining" },
            { label: "Manufacturing", href: "/industries/manufacturing" },
            { label: "Engineering", href: "/industries/engineering" },
          ],
        },
        {
          heading: "Resources",
          links: [
            { label: "Resources", href: "/resources" },
            { label: "Contact", href: "/contact" },
          ],
        },
        {
          heading: "Company",
          links: [
            { label: "About Annix", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
      newsletterHeading: "Stay connected",
      newsletterBody: "Get the latest updates and insights straight to your inbox.",
      socialLinks: [
        { platform: "LinkedIn", href: "#" },
        { platform: "Facebook", href: "#" },
        { platform: "YouTube", href: "#" },
        { platform: "Instagram", href: "#" },
      ],
      legalLinks: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Use", href: "#" },
      ],
      legal: "All rights reserved.",
    },
    productPages: PRODUCT_PAGES,
    labs: {
      heading: "What's next",
      subheading: "The next wave of Annix products, built on the same shared platform.",
      items: [],
    },
    about: {
      heading: "We build intelligent platforms for industry.",
      body: "Annix is a platform company. Rather than a scattered collection of apps, every Annix product is built on one shared foundation — the same backend, the same intelligence, the same design language. That is how we ship products that genuinely work together.",
      values: [
        {
          title: "One platform",
          body: "Shared infrastructure means every product gets better as the platform does.",
        },
        {
          title: "Built-in intelligence",
          body: "AI is woven through every product, not bolted on after the fact.",
        },
        {
          title: "Industrial first",
          body: "Designed for the realities of heavy, regulated and field-driven work.",
        },
      ],
    },
  };
}
