import type { MarketingProduct, MarketingProductPage, MarketingSiteContent } from "./content";

const ECOSYSTEM_PRODUCTS: MarketingProduct[] = [
  {
    appKey: "annix-core",
    portalCode: "stock-control",
    name: "Annix Core",
    category: "Industrial Operations",
    blurb:
      "Stock control, quality certificates and inventory intelligence for fabrication and manufacturing teams.",
    iconSlot: "Boxes",
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
    comingSoon: false,
    detailSlug: "annix-forge",
  },
  {
    appKey: "annix-orbit",
    portalCode: "annix-orbit",
    name: "Annix Orbit",
    category: "Workforce & Recruitment",
    blurb:
      "Recruitment, CV building and a live job market connecting seekers, recruiters and education pathways.",
    iconSlot: "Orbit",
    comingSoon: false,
    detailSlug: "annix-orbit",
  },
  {
    appKey: "annix-rep",
    portalCode: "annix-rep",
    name: "Annix Pulse",
    category: "Field Operations",
    blurb:
      "Field reps, routes and voice-driven activity capture that keep distributed teams moving and accountable.",
    iconSlot: "Radio",
    comingSoon: false,
    detailSlug: "annix-pulse",
  },
  {
    appKey: "annix-sentinel",
    portalCode: "annix-sentinel",
    name: "Annix Sentinel",
    category: "Compliance & Governance",
    blurb:
      "Secure document handling, audit trails and compliance workflows for regulated industrial operations.",
    iconSlot: "ShieldCheck",
    comingSoon: false,
    detailSlug: "annix-sentinel",
  },
  {
    appKey: "teacher-assistant",
    portalCode: "teacher-assistant",
    name: "Annix Learn",
    category: "Education & Development",
    blurb:
      "Teaching tools and the FuturePath education-to-funding lifecycle that grows the next generation of talent.",
    iconSlot: "GraduationCap",
    comingSoon: false,
    detailSlug: "annix-learn",
  },
  {
    appKey: "insights",
    portalCode: "insights",
    name: "Annix Insights",
    category: "Financial Intelligence",
    blurb:
      "Cross-product reporting and financial intelligence that turn operational data into decisions.",
    iconSlot: "LineChart",
    comingSoon: false,
    detailSlug: "annix-insights",
  },
  {
    appKey: "annix-investments",
    portalCode: null,
    name: "Annix Labs",
    category: "Coming Soon",
    blurb:
      "An incubator for the next wave of Annix products. Built on the same shared platform, the same intelligence.",
    iconSlot: "Sparkles",
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
      "Stock, quality and inventory intelligence in one place — so your fabrication floor always knows what it has and what it is certified to do.",
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
    slug: "annix-learn",
    appKey: "teacher-assistant",
    portalCode: "teacher-assistant",
    name: "Annix Learn",
    headline: "Build the next generation of talent.",
    subheading:
      "Teaching tools and the FuturePath education-to-funding lifecycle that grows skills from the classroom to the workplace.",
    problem:
      "Education and the job market rarely speak to each other, so potential is lost between the classroom and a career.",
    features: [
      {
        title: "Teaching tools",
        blurb: "Practical assistance for educators.",
        iconSlot: "GraduationCap",
      },
      {
        title: "FuturePath",
        blurb: "Education-to-funding pathways tied to real opportunities.",
        iconSlot: "Compass",
      },
      {
        title: "Connected to Orbit",
        blurb: "Learning that flows straight into the live job market.",
        iconSlot: "Orbit",
      },
    ],
    industries: ["Education"],
    roi: [
      { metric: "Connected", label: "learning and work" },
      { metric: "Guided", label: "funding pathways" },
      { metric: "Practical", label: "teaching tools" },
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
    hero: {
      eyebrow: "The Annix Platform",
      headlineLead: "One platform.",
      headlineEmphasis: "Every product.",
      subheading:
        "Annix builds intelligent platforms for industry — operations, engineering, workforce, compliance and beyond — all on one shared foundation.",
      primaryCta: { label: "Explore the ecosystem", href: "#ecosystem" },
      secondaryCta: { label: "Book a demo", href: "/contact" },
      stats: [
        { value: "7", label: "Products" },
        { value: "1", label: "Shared platform" },
        { value: "AI", label: "Built in" },
      ],
    },
    ecosystem: {
      heading: "One brand. Many products.",
      subheading:
        "Every Annix product shares the same backend, intelligence and design language — so they work together out of the box.",
      products: ECOSYSTEM_PRODUCTS,
    },
    industries: {
      heading: "Built for the industries that build everything else.",
      subheading: "Annix is designed for the realities of heavy, regulated and field-driven work.",
      items: [
        {
          name: "Mining",
          blurb: "Operations, compliance and supply chains built for the mining sector.",
          iconSlot: "Mountain",
          slug: "mining",
        },
        {
          name: "Manufacturing",
          blurb: "Stock, quality and field operations for manufacturers.",
          iconSlot: "Factory",
          slug: "manufacturing",
        },
        {
          name: "Engineering",
          blurb: "Standards-aware quoting and procurement for engineering teams.",
          iconSlot: "Wrench",
          slug: "engineering",
        },
        {
          name: "Education",
          blurb: "Teaching tools and pathways that connect learning to careers.",
          iconSlot: "GraduationCap",
          slug: "education",
        },
      ],
    },
    trustBar: {
      heading: "Built for industrial teams across Southern Africa.",
      regions: ["Mining", "Manufacturing", "Engineering", "Fabrication", "Education"],
    },
    ctaBand: {
      headline: "See the Annix platform in action.",
      subheading: "Book a walkthrough and we will show you the products that fit your operation.",
      primaryCta: { label: "Book a demo", href: "/contact" },
      secondaryCta: { label: "Explore products", href: "#ecosystem" },
    },
    footer: {
      tagline: "Build • Connect • Innovate • Grow",
      columns: [
        {
          heading: "Platform",
          links: [
            { label: "Products", href: "#ecosystem" },
            { label: "Industries", href: "#industries" },
            { label: "Annix Labs", href: "/labs" },
          ],
        },
        {
          heading: "Company",
          links: [
            { label: "About", href: "/about" },
            { label: "Resources", href: "/resources" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
      legal: "All rights reserved.",
    },
    productPages: PRODUCT_PAGES,
    labs: {
      heading: "Annix Labs",
      subheading: "The next wave of Annix products, built on the same shared platform.",
      items: [
        {
          name: "New product",
          blurb: "We are always building. The next Annix product starts in the Labs.",
          status: "Coming soon",
        },
      ],
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
