import type {
  MarketingProduct,
  MarketingProductPage,
  MarketingResource,
  MarketingSiteContent,
} from "./content";

const ECOSYSTEM_PRODUCTS: MarketingProduct[] = [
  {
    appKey: "annix-core",
    portalCode: "stock-control",
    name: "Annix Core",
    category: "Industrial Operations",
    blurb:
      "Streamline operations, inventory, production and supplier management with quality certificates built in.",
    iconSlot: "Boxes",
    imageUrl: "/api/public/branding/annix-core/asset/loginCard",
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
    imageUrl: "/api/public/branding/annix-forge/asset/loginCard",
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
    imageUrl: "/api/public/branding/annix-orbit/asset/loginCard",
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
    imageUrl: "/api/public/branding/annix-rep/asset/loginCard",
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
    imageUrl: "/api/public/branding/annix-sentinel/asset/loginCard",
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

const RESOURCES: MarketingResource[] = [
  {
    slug: "operations-traceability-guide",
    category: "Guides & Playbooks",
    title: "Digitising stock, quality and CoCs on the fabrication floor",
    excerpt:
      "A practical guide to getting real-time stock, quality records and certificates of conformance under one roof.",
    body: 'Most industrial operations still run inventory in one system, quality in another, and certificates in a filing cabinet. The result is slow stock takes, lost certificates, and a floor that never quite knows what it has or what it is certified to do.\n\nAnnix Core brings inventory, jobs, deliveries, quality certificates and material traceability into a single platform. Goods-in, supplier invoices, job cards and batch assignments share one data model, so a batch number on the floor traces straight back to its certificate.\n\nStart by getting goods-in and stock valuation live, then layer on job cards and quality certificates. Within a few weeks your floor moves from "where is that cert?" to full job-level traceability — audit-ready by default.',
    imageUrl: null,
    productSlug: "annix-core",
    published: true,
  },
  {
    slug: "standards-aware-quoting-playbook",
    category: "Guides & Playbooks",
    title: "RFQ to award: a standards-aware quoting playbook",
    excerpt:
      "How to turn drawings and specs into accurate, weld-aware quotes — and win more work without under-pricing.",
    body: "Quoting fabrication work is where margin is made or lost. Miss a weld length, forget a coating area, or price against the wrong standard, and the job is unprofitable before it starts.\n\nAnnix Forge structures the whole pipeline — RFQ, bill of quantities, quote, award. Items consolidate into a BOQ with weld lengths, coating areas and quantities calculated for you, and pricing is built around the ASME, API, NACE and SANS standards your customers audit against.\n\nThe playbook is simple: capture the RFQ with its drawings and specs, let the BOQ do the weld math, price with material, labour and engineering allowances, then compare quotes and award with full visibility. Every number traces back to the spec.",
    imageUrl: null,
    productSlug: "annix-forge",
    published: true,
  },
  {
    slug: "compliance-program-guide",
    category: "Guides & Playbooks",
    title: "Building a POPIA, B-BBEE and King IV-ready compliance program",
    excerpt:
      "A starting framework for South African businesses to get compliant, manage risk and stay audit-ready year-round.",
    body: "Compliance in South Africa is not one thing — it is POPIA, B-BBEE, tax deadlines, King IV governance and a moving target of regulation. Most businesses only discover a gap when an audit or a deadline is already on them.\n\nAnnix Sentinel turns that reactive scramble into a continuous program. Map the regulations that apply to your business, track requirements and evidence in one view, work out your B-BBEE scorecard, and get proactive alerts before statutory deadlines.\n\nThe practical sequence: build your requirement register, attach evidence to each item, set the deadline calendar, then let the advisor flag risks and surface daily regulatory updates. Audit-ready becomes a state you stay in, not a project you panic over.",
    imageUrl: null,
    productSlug: "annix-sentinel",
    published: true,
  },
  {
    slug: "ee-compliant-hiring-guide",
    category: "Guides & Playbooks",
    title: "Hiring in regulated industries without tripping up on EE",
    excerpt:
      "How to recruit faster while keeping Employment Equity reporting and POPIA in good standing.",
    body: "Industrial and regulated employers carry a double burden: they need talent quickly, and they need to hire in a way that stands up to Employment Equity reporting and POPIA.\n\nAnnix Orbit is a live job market that connects seekers, recruiters and employers, with AI matching on skills, experience, location and work profile. Employment Equity reporting and POPIA-compliant data handling are built in rather than bolted on.\n\nFor employers the workflow is end-to-end — post a role, screen with AI, schedule interviews, manage references — while the compliance layer keeps your equity picture accurate. For students, FuturePath guides subject planning, careers and funding, feeding a pipeline of work-ready talent.",
    imageUrl: null,
    productSlug: "annix-orbit",
    published: true,
  },
  {
    slug: "field-sales-playbook",
    category: "Guides & Playbooks",
    title: "The field-sales playbook: turning meetings into pipeline",
    excerpt:
      "A mobile-first approach to finding prospects, running better meetings and capturing every insight.",
    body: "Field sales lives and dies on what happens between meetings — the prospect you did not follow up, the insight you forgot to log, the route that wasted half a day.\n\nAnnix Pulse is a mobile-first sales assistant that helps reps discover and qualify prospects nearby, plan routes and schedules, and record, transcribe and summarise every meeting automatically. Pipeline and performance update in real time.\n\nThe playbook: let location-based discovery fill the top of the funnel, use smart scheduling to cut travel time, and let AI meeting intelligence capture the detail so reps sell instead of typing.",
    imageUrl: null,
    productSlug: "annix-pulse",
    published: true,
  },
  {
    slug: "asme-b16-5-explained",
    category: "Standards & Compliance",
    title: "ASME B16.5, in plain English",
    excerpt:
      "What the pipe-flange standard covers, why pressure-temperature class matters, and where it bites on a quote.",
    body: "ASME B16.5 is the standard that governs pipe flanges and flanged fittings up to NPS 24. In practice it tells you which flange — by material, class and rating — is fit for a given pressure and temperature.\n\nThe part that matters commercially is the pressure-temperature class (150 through 2500). Quote against the wrong class and you have either over-specified and lost the job, or under-specified and created a safety and liability problem.\n\nAnnix Forge keeps the standard's intent in your quoting flow so the right class follows the spec. We reference the standard by name; we do not republish its rating tables — the standard itself, or your engineering team, remains the source of truth on the numbers.",
    imageUrl: null,
    productSlug: "annix-forge",
    published: true,
  },
  {
    slug: "api-5l-psl1-vs-psl2",
    category: "Standards & Compliance",
    title: "API 5L: PSL1 vs PSL2, and why it matters for line pipe",
    excerpt:
      "The two product specification levels of line pipe, and how the choice flows into your pricing.",
    body: "API 5L specifies line pipe for oil and gas. The headline decision is the product specification level: PSL1, a basic standard, or PSL2, with tighter chemistry, testing and documentation requirements.\n\nPSL2 costs more — more testing, more traceability — but it is what many operators and harsher services demand. Picking the wrong level either prices you out or commits you to scope you did not quote for.\n\nForge keeps the PSL choice visible on the BOQ so the material, testing and documentation allowances match what the customer actually requires. We reference API 5L by name and keep its requirements out of the data you maintain by hand.",
    imageUrl: null,
    productSlug: "annix-forge",
    published: true,
  },
  {
    slug: "nace-mr0175-sour-service",
    category: "Standards & Compliance",
    title: "NACE MR0175 / ISO 15156 and sour service",
    excerpt:
      'What "sour service" means and why material selection for H2S environments cannot be guessed.',
    body: 'NACE MR0175, also published as ISO 15156, governs material selection for equipment exposed to hydrogen sulphide — "sour service". In those environments the wrong material can crack and fail catastrophically.\n\nThe standard exists because sour service is unforgiving: material, hardness and processing all have to be right. For a fabricator, it means the quote has to reflect compliant materials and the testing to prove it.\n\nAnnix Forge surfaces sour-service requirements alongside the rest of the spec so they are priced, not discovered after award. As with all standards, we reference MR0175 by name — the standard remains the authority on what is compliant.',
    imageUrl: null,
    productSlug: "annix-forge",
    published: true,
  },
  {
    slug: "popia-for-smes",
    category: "Standards & Compliance",
    title: "POPIA for South African businesses",
    excerpt:
      "The plain-language version of what POPIA asks of you, and how to stay on the right side of it.",
    body: "The Protection of Personal Information Act sets the rules for how South African businesses collect, store and use personal data. It applies to almost everyone — customers, employees, suppliers — and the penalties for getting it wrong are real.\n\nAt its core POPIA asks you to collect only what you need, keep it secure, use it for the purpose you stated, and let people see and erase their data. The hard part is not the principles; it is evidencing them continuously.\n\nAnnix Sentinel tracks your POPIA obligations as live requirements with attached evidence and audit trails, and the whole Annix platform is built POPIA-first — data is secured, scoped per company, and retained only as long as it should be.",
    imageUrl: null,
    productSlug: "annix-sentinel",
    published: true,
  },
  {
    slug: "bbbee-scorecard-explained",
    category: "Standards & Compliance",
    title: "The B-BBEE scorecard, explained",
    excerpt:
      "How the scorecard elements fit together and why your level changes who you can do business with.",
    body: "Broad-Based Black Economic Empowerment is measured on a scorecard made up of elements — ownership, management control, skills development, enterprise and supplier development, and socio-economic development. Your points across those elements determine your B-BBEE level.\n\nThat level matters commercially: it affects which tenders you qualify for and how attractive you are as a supplier to larger, compliance-conscious customers.\n\nAnnix Sentinel lets you manage each element, calculate your score, and model what moves the needle — so B-BBEE becomes something you plan for, not something you scramble to certify once a year.",
    imageUrl: null,
    productSlug: "annix-sentinel",
    published: true,
  },
  {
    slug: "industry-brief-mining",
    category: "Industry Briefs",
    title: "Annix for Mining",
    excerpt:
      "Operations, compliance and supply chains built for the realities of the mining sector.",
    body: "Mining runs on heavy assets, strict compliance and unforgiving supply chains. Annix Core keeps stock, quality and certificates traceable on the floor; Forge prices engineering and fabrication procurement around the right standards; Sentinel keeps safety and statutory compliance continuous; and Orbit keeps a skilled, equity-compliant workforce flowing.\n\nThe common thread is one platform with shared data and complete traceability — so a certificate, a quote and a hire all live in the same audit-ready system.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "industry-brief-manufacturing",
    category: "Industry Briefs",
    title: "Annix for Manufacturing",
    excerpt: "Production, quality and procurement on one shared, traceable foundation.",
    body: "Manufacturers juggle production, inventory, quality and a constant flow of RFQs. Annix Core gives real-time stock and quality with proper valuation; Forge turns enquiries into weld-aware, standards-correct quotes; Sentinel keeps quality and regulatory compliance evidenced; Orbit keeps the line staffed.\n\nBecause every product sits on the same backend and design language, your shop floor, your quoting desk and your compliance team finally see the same data.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "industry-brief-engineering",
    category: "Industry Briefs",
    title: "Annix for Engineering",
    excerpt: "Standards-aware quoting and operations for engineering-led businesses.",
    body: "Engineering work lives or dies on getting the standards right and the numbers tight. Annix Forge is built for exactly that — RFQ to BOQ to quote, with weld math and ASME, API, NACE and SANS awareness baked in. Core keeps the operational side traceable, Sentinel keeps compliance continuous, and Orbit keeps the right talent in the building.\n\nIt is one ecosystem, so an engineering quote, the job that follows, and its compliance record never live in separate silos.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "industry-brief-construction",
    category: "Industry Briefs",
    title: "Annix for Construction",
    excerpt: "Quoting, materials and compliance for construction and built-environment teams.",
    body: "Construction projects move fast and carry heavy compliance and safety obligations. Annix Forge handles standards-aware quoting and bills of quantity; Core tracks materials and operations; Sentinel keeps safety and statutory compliance evidenced; Orbit keeps crews staffed and equity-compliant.\n\nOne platform means the quote, the materials and the compliance file for a project all share a single, traceable source of truth.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "industry-brief-energy",
    category: "Industry Briefs",
    title: "Annix for Energy",
    excerpt: "Built for the standards, scale and compliance demands of the energy sector.",
    body: "Energy projects involve specialised piping, harsh-service materials and intense regulatory scrutiny. Annix Forge prices the engineering and fabrication around the right standards, including sour-service and pressure ratings; Core keeps operations traceable; Sentinel keeps compliance continuous; Orbit keeps a skilled workforce flowing.\n\nThe payoff is a single, audit-ready ecosystem from quote to compliance, built for high-stakes work.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "industry-brief-logistics",
    category: "Industry Briefs",
    title: "Annix for Logistics",
    excerpt: "Inventory, workforce and compliance for moving goods and teams with confidence.",
    body: "Logistics operations need tight inventory, mobile teams and dependable compliance. Annix Core keeps stock and movements accurate; Orbit keeps the workforce flowing; Pulse keeps distributed field teams moving and accountable; Sentinel keeps the compliance picture clean.\n\nOne connected platform means your stock, your people and your obligations are visible in the same place, wherever the work happens.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "industry-brief-education",
    category: "Industry Briefs",
    title: "Annix for Education",
    excerpt: "Career pathways, compliance and workforce tools for the education sector.",
    body: "Education is where the future workforce is shaped. Annix Orbit's FuturePath helps students plan subjects, explore careers and find funding, while connecting them to a live job market. Sentinel keeps institutions on the right side of POPIA and governance.\n\nIt is the workforce pipeline and the compliance backbone in one ecosystem — preparing people for industry and keeping institutions accountable.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "nix-ai-document-extraction",
    category: "Platform",
    title: "Nix AI: how document extraction works across Annix",
    excerpt:
      "The AI layer that reads your documents — certificates, RFQs, compliance evidence — and turns them into structured data.",
    body: "Every Annix app deals in documents: certificates of conformance, RFQ drawings and specs, compliance evidence, CVs. Nix is the shared AI that reads them and turns them into structured, reviewable data instead of manual capture.\n\nUpload a document and Nix extracts the fields, presents a draft for review, and lets a person confirm before anything is committed. The same extraction engine powers Core's certificates, Forge's quote documents and Sentinel's evidence matching.\n\nBecause it is built once and shared, every app gets smarter together — and because there is always a human-in-the-loop review step, you get the speed of AI without giving up control.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "one-platform-shared-foundation",
    category: "Platform",
    title: "One platform, one backend: why Annix products work together",
    excerpt:
      "What it means that every Annix product shares the same backend, intelligence and design language.",
    body: "Most businesses end up with a scattered collection of apps that do not talk to each other. Annix is built the other way around: every product — Core, Forge, Orbit, Pulse, Sentinel, Insights — sits on one shared backend, one AI layer and one design language.\n\nThat means shared company data, consistent roles and permissions, audit logs everywhere, and the same Nix AI across apps. Adopt one product and the next one already knows your business.\n\nIt is the difference between integrating five vendors and switching on a module — and it is why an operation can grow across sites, teams and functions without re-platforming.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
  {
    slug: "nexus-one-api-every-model",
    category: "Developers",
    title: "Annix Nexus: one API for every model",
    excerpt:
      "The AI gateway that powers every Annix app — and gives developers one integration for many models.",
    body: "Annix Nexus is the central AI gateway behind the whole ecosystem. Instead of wiring each app to a different AI provider, Nexus exposes one API and routes each request to the best model for the job, with smart routing, cost optimisation and full observability.\n\nFor developers that means one integration, no vendor lock-in, and enterprise controls: security, company-scoped access, rate limits and audit trails. The same gateway that powers Annix's document extraction and matching is available to build on.\n\nNexus is private-access and company-scoped today; request access to build against it.",
    imageUrl: null,
    productSlug: "annix-nexus",
    published: true,
  },
  {
    slug: "security-popia-data-residency",
    category: "Trust & Security",
    title: "Security, POPIA and data residency at Annix",
    excerpt: "How Annix keeps your data secure, compliant and scoped to your company.",
    body: "Annix is built for businesses that take data seriously. Access is role-based and scoped per company, every sensitive action is logged, and the platform is designed POPIA-first — you collect what you need, keep it secure and retain it only as long as you should.\n\nData lives on managed cloud infrastructure with per-environment isolation, and AI features run through a controlled gateway rather than ad-hoc calls to third parties.\n\nIf you need specifics for a security review — data residency, retention, access controls — our team can walk you through them. Start with Book a Demo.",
    imageUrl: null,
    productSlug: "",
    published: true,
  },
];

const PRIVACY_BODY = `Annix ("Annix", "we", "us" or "our") is committed to protecting your privacy and handling your personal information responsibly and in accordance with the Protection of Personal Information Act, 2013 ("POPIA") and other applicable South African law. This Privacy Policy explains what personal information we collect, how we use it, who we share it with, and the rights available to you.

This policy applies to our websites, applications and services (together, the "Services"), and to personal information we process as the responsible party. By using the Services you acknowledge that you have read and understood this policy.

## Who we are
Annix is a company incorporated in the Republic of South Africa. For the purposes of POPIA, Annix is the "responsible party" for the personal information described in this policy. Our registration and contact details are set out at the end of this policy and on our Contact page.

## Information we collect
We collect personal information in the following ways:

- Information you provide — such as your name, email address, telephone number, company name, job title, and the contents of enquiries or messages you send us, including through our book-a-demo and contact forms.
- Information collected automatically — such as your IP address, device and browser type, pages viewed and usage data, collected through cookies and similar technologies.
- Information from third parties — such as our service providers, business partners and publicly available sources, where lawful.

We do not deliberately collect special personal information (as defined in POPIA) unless it is necessary for a specific, lawful purpose for which we have an appropriate legal basis.

## How we use your information
We process personal information to:

- provide, operate, maintain and improve the Services;
- respond to your enquiries, demo requests and support requests;
- communicate with you about the Services, including service and, where permitted, marketing messages;
- administer accounts, billing and security;
- comply with our legal and regulatory obligations; and
- protect our rights, property and safety and those of our users and the public.

We rely on lawful bases recognised by POPIA, including consent, performance of a contract, compliance with a legal obligation, and the pursuit of our or a third party's legitimate interests.

## Marketing communications
Where we send electronic marketing, we do so in accordance with applicable law. You may opt out at any time using the unsubscribe mechanism in the message or by contacting us.

## How we share your information
We do not sell your personal information. We may share it with:

- service providers who process information on our behalf — for example hosting, email delivery, analytics and AI processing providers — under appropriate confidentiality and data-protection obligations;
- professional advisers, regulators and authorities where required or permitted by law;
- a successor entity in connection with a merger, acquisition or sale of assets; and
- other parties with your consent.

## International transfers
Some service providers may process personal information outside South Africa. Where we transfer personal information across borders, we take steps to ensure it remains protected in accordance with POPIA, including by requiring that recipients are subject to laws, binding rules or agreements that provide an adequate level of protection.

## Information security
We implement appropriate, reasonable technical and organisational measures to protect personal information against loss, damage, unauthorised access and unlawful processing, including access controls, encryption where appropriate, audit logging and per-company data scoping. No method of transmission or storage is entirely secure, and we cannot guarantee absolute security.

## Retention
We retain personal information only for as long as necessary to fulfil the purposes for which it was collected, including to meet legal, accounting, regulatory or reporting requirements, after which it is deleted or de-identified.

## Your rights
Subject to POPIA and applicable law, you have the right to:

- request access to the personal information we hold about you;
- request correction or deletion of your personal information;
- object to processing in certain circumstances;
- withdraw consent where processing is based on consent; and
- lodge a complaint with the Information Regulator.

To exercise these rights, contact our Information Officer using the details below. We may need to verify your identity before responding.

## Cookies and similar technologies
We use cookies and similar technologies to operate our websites, remember your preferences and understand how the Services are used. You can control cookies through your browser settings; disabling some cookies may affect functionality.

## Children
The Services are not directed at children, and we do not knowingly collect personal information from children without the consent of a competent person, except where permitted by law.

## Changes to this policy
We may update this policy from time to time. The current version is always available on our website and the "last updated" date reflects the most recent changes. We will bring material changes to your attention where required by law.

## How to contact us
If you have questions about this policy or wish to exercise your rights, please contact our Information Officer:

- Responsible party: Annix
- Information Officer: [insert Information Officer name]
- Contact email: [insert privacy contact email]
- Registered address: [insert registered address]
- Company registration number: [insert registration number]

You also have the right to lodge a complaint with the Information Regulator (South Africa). The Regulator's current contact details are available on its official website.`;

const TERMS_BODY = `These Terms of Use ("Terms") govern your access to and use of Annix's websites, applications and services (together, the "Services"). By accessing or using the Services, you agree to be bound by these Terms. If you do not agree, you must not use the Services.

## Who we are
The Services are provided by Annix, a company incorporated in the Republic of South Africa ("Annix", "we", "us" or "our"). Our registration and contact details are available on our Contact page.

## Eligibility
You may use the Services only if you can form a binding contract with Annix and are not barred from doing so under applicable law. If you use the Services on behalf of an organisation, you confirm that you are authorised to bind that organisation to these Terms.

## Accounts and security
Some Services require an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us promptly of any unauthorised use. We may suspend or terminate accounts that are inactive, compromised, or used in breach of these Terms.

## Acceptable use
You agree not to:

- use the Services unlawfully or for any harmful or fraudulent purpose;
- interfere with or disrupt the integrity, security or performance of the Services;
- attempt to gain unauthorised access to the Services or related systems or data;
- reverse engineer, decompile or copy any part of the Services except as permitted by law;
- upload malicious code or content that infringes the rights of others; or
- use the Services to send unsolicited communications or to misrepresent your identity.

## Intellectual property
The Services, including all software, text, graphics, logos and other content (excluding your content), are owned by or licensed to Annix and are protected by intellectual-property laws. We grant you a limited, non-exclusive, non-transferable, revocable right to use the Services for their intended purpose, subject to these Terms. No other rights are granted.

## Your content and data
You retain ownership of the data and content you submit to the Services ("Customer Data"). You grant us a licence to host, process and use Customer Data only as necessary to provide and improve the Services, and as described in our Privacy Policy. You are responsible for ensuring that you have the rights and any necessary consents to provide Customer Data and that it does not infringe any law or third-party rights.

## Third-party services
The Services may integrate with or link to third-party products and services. We are not responsible for third-party services, and your use of them is governed by their own terms and policies.

## Service availability and changes
We aim to keep the Services available and reliable, but we provide them on an "as is" and "as available" basis. We may modify, suspend or discontinue any part of the Services at any time, and may set out additional terms for specific products or paid services in a separate agreement, which will prevail over these Terms to the extent of any conflict.

## Disclaimers
To the maximum extent permitted by law, the Services are provided without warranties of any kind, whether express or implied, including any implied warranties of merchantability, fitness for a particular purpose, accuracy or non-infringement. We do not warrant that the Services will be uninterrupted, error-free or secure. Nothing in these Terms excludes or limits any rights you may have under the Consumer Protection Act, 2008 or other applicable law that cannot lawfully be excluded.

## Limitation of liability
To the maximum extent permitted by law, Annix will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, revenue, data or goodwill, arising out of or relating to your use of the Services. To the extent our liability cannot be excluded, it is limited to the amount you paid us for the relevant Service in the three months preceding the event giving rise to the claim, or, where no fee was paid, to a reasonable amount determined in accordance with law.

## Indemnity
You agree to indemnify and hold Annix harmless against claims, losses and expenses arising from your breach of these Terms, your misuse of the Services, or your Customer Data, to the extent permitted by law.

## Suspension and termination
We may suspend or terminate your access to the Services if you breach these Terms or if necessary to protect the Services, other users or third parties. You may stop using the Services at any time. Provisions that by their nature should survive termination will continue to apply.

## Privacy
Your use of the Services is also governed by our Privacy Policy, which explains how we handle personal information.

## Governing law and jurisdiction
These Terms are governed by the laws of the Republic of South Africa. You submit to the non-exclusive jurisdiction of the South African courts in relation to any dispute arising out of or in connection with these Terms or the Services.

## Changes to these Terms
We may update these Terms from time to time. The current version is always available on our website and the "last updated" date reflects the most recent changes. Your continued use of the Services after changes take effect constitutes acceptance of the updated Terms.

## General
If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force. Our failure to enforce a provision is not a waiver of it. You may not assign these Terms without our consent; we may assign them as part of a corporate transaction. These Terms, together with any product-specific agreement and our Privacy Policy, constitute the entire agreement between you and Annix regarding the Services.

## Contact
Questions about these Terms can be sent to us using the details on our Contact page.`;

export function defaultMarketingContent(): MarketingSiteContent {
  return {
    site: {
      logoUrl: null,
      wordmarkImageUrl: null,
      wordmark: "ANNIX INVESTMENTS",
      accentColor: "#E0B44A",
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
          imageUrl: "/marketing/industries/mining.png",
          slug: "mining",
        },
        {
          name: "Manufacturing",
          blurb: "Stock, quality and field operations for manufacturers.",
          iconSlot: "Factory",
          imageUrl: "/marketing/industries/manufacturing.png",
          slug: "manufacturing",
        },
        {
          name: "Engineering",
          blurb: "Standards-aware quoting and procurement.",
          iconSlot: "Wrench",
          imageUrl: "/marketing/industries/engineering.png",
          slug: "engineering",
        },
        {
          name: "Construction",
          blurb: "Built for construction and fabrication teams.",
          iconSlot: "Hammer",
          imageUrl: "/marketing/industries/construction.png",
          slug: "construction",
        },
        {
          name: "Energy",
          blurb: "For energy and resource operations.",
          iconSlot: "Flame",
          imageUrl: "/marketing/industries/energy.png",
          slug: "energy",
        },
        {
          name: "Logistics",
          blurb: "Move goods and teams with confidence.",
          iconSlot: "Map",
          imageUrl: "/marketing/industries/logistics.png",
          slug: "logistics",
        },
        {
          name: "Education",
          blurb: "Teaching tools and pathways to careers.",
          iconSlot: "GraduationCap",
          imageUrl: "/marketing/industries/education.png",
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
        { region: "South Africa", label: "Head Office", detail: "Cape Town", flag: "ZA" },
        { region: "Australia", label: "Sales Office", detail: "Perth", flag: "AU" },
        { region: "Europe", label: "Partners", detail: "Across EU", flag: "EU" },
        { region: "Americas", label: "Partners", detail: "Across USA", flag: "US" },
      ],
    },
    ctaBand: {
      headline: "Ready to transform your business?",
      subheading:
        "Book a demo with our team and see how Annix solutions can help you work smarter and grow faster.",
      primaryCta: { label: "Book a Demo", href: "/contact" },
      secondaryCta: { label: "Contact Us", href: "/contact" },
      backgroundImageUrl: "/marketing/connect-bg.png",
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
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
      ],
      legal: "All rights reserved.",
      designedByLogoUrl: null,
      designedByUrl: "",
      hostedByLogoUrl: null,
      hostedByUrl: "",
    },
    productPages: PRODUCT_PAGES,
    labs: {
      heading: "What's next",
      subheading: "The next wave of Annix products, built on the same shared platform.",
      items: [],
    },
    about: {
      heading: "We build the software industry actually needs.",
      body: "Annix is a South African platform company building intelligent software for the businesses that keep the world running — the miners, manufacturers, engineers, fabricators and the people who staff and supply them. Rather than another scattered set of disconnected apps, every Annix product is built on one shared foundation: the same backend, the same AI, the same design language. That is how we ship products that genuinely work together.",
      leadImageUrl: null,
      storyHeading: "Why we built Annix",
      storyBody:
        "We started Annix because we lived the problem. Industrial businesses were being sold a different system for every job — one for stock, one for quoting, one for compliance, one for hiring — and none of them spoke to each other. Teams drowned in spreadsheets and paper certificates while the data they needed sat trapped in silos.\n\nSo we built the opposite. One platform, many products, all sharing data and intelligence. From a certificate on the factory floor to a quote, a compliance record or a new hire, it all lives in the same audit-ready system. We engineer in South Africa, for the realities of heavy, regulated and field-driven work, and we deliver to businesses across the globe.",
      storyImageUrl: null,
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
        {
          title: "Compliance by default",
          body: "Security, audit trails and POPIA-first data handling are built in, never an afterthought.",
        },
      ],
      mission:
        "Our mission is simple: give every industrial business one intelligent platform to run on — so they can spend less time fighting their tools and more time building, making and growing.",
      missionImageUrl: null,
    },
    resources: {
      heading: "Resources",
      subheading:
        "Guides, standards explainers and industry briefs to help you get the most out of Annix.",
      items: RESOURCES,
    },
    legal: {
      privacy: {
        heading: "Privacy Policy",
        lastUpdated: "3 June 2026",
        body: PRIVACY_BODY,
      },
      terms: {
        heading: "Terms of Use",
        lastUpdated: "3 June 2026",
        body: TERMS_BODY,
      },
    },
  };
}
