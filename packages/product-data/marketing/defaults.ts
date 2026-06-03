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

const PRIVACY_BODY = `Annix ("Annix", "we", "us" or "our") is committed to protecting your privacy and to processing your personal information lawfully, reasonably and in a manner that does not infringe your privacy, in accordance with the Protection of Personal Information Act, 2013 ("POPIA") and other applicable South African law. This Privacy Policy explains what personal information we collect, how we use it, when we share it, how long we keep it, and the rights available to you when you use our websites, applications, products and services (together, the "Services"). It should be read together with our Terms of Use and our Cookie Policy.

## Who we are
Annix is a company incorporated in the Republic of South Africa and is the "responsible party" for the personal information described in this policy. Our company and contact details are set out in the "Information Officer and contact details" section below.

## Information we collect
Depending on how you interact with the Services, we may collect:

- Identity details — such as your name, surname and title.
- Contact details — such as email address, telephone number and postal or physical address.
- Account details — such as username, password and profile information.
- Transaction and billing details — such as orders, invoices, payment status and billing information.
- Technical and usage data — such as IP address, device identifiers, browser type, operating system and website usage data, collected through cookies and similar technologies.
- Communication details — such as enquiries, support requests, feedback and records of communications with us.
- Any other information you choose to provide through forms, uploads or communications.

We only process special personal information (as defined in POPIA) where permitted by POPIA and for a lawful, specified purpose.

## Voluntary or mandatory information
Where we request information, we will indicate whether it is required or optional. Some information is required to provide the Services, complete a transaction or comply with the law. If you do not provide required information, we may be unable to create your account, deliver a requested service, process a payment, or respond to your request. Optional information helps us improve your experience but is not required.

## How we collect information
We collect personal information directly from you (for example when you create an account, complete a form, transact, subscribe or contact us), automatically through cookies, analytics tools and server logs, and from third parties such as service providers, business partners and publicly available sources, where lawful.

## Why we process personal information
We process personal information to:

- provide, operate, maintain and improve the Services;
- create and manage accounts;
- process payments, billing and refunds;
- respond to enquiries and provide support;
- personalise and secure the Services;
- send service and administrative communications;
- send marketing communications where permitted by law and with consent where required;
- detect, prevent and investigate fraud, abuse and security incidents; and
- comply with legal obligations and enforce our agreements.

## Lawful basis
We process personal information only where permitted under POPIA and only for a lawful and specified purpose. Depending on the circumstances, this may include processing that is necessary for the performance of a contract, compliance with a legal obligation, the protection of a legitimate interest, or where you have consented. Where processing is based on consent, you may withdraw it at any time.

## Sharing and disclosure
We do not sell your personal information. We may share it with:

- our employees, contractors and authorised personnel;
- service providers and operators who process information on our behalf — for example hosting, cloud, analytics, payment, communications, IT and AI-processing providers — under appropriate confidentiality and data-protection obligations;
- professional advisers such as auditors, insurers and lawyers;
- regulators, courts, law-enforcement and public bodies where required or permitted by law; and
- a successor or other party in connection with a merger, acquisition or restructuring, or with your consent.

Where we engage operators, we require them to process personal information only on our instructions and to apply appropriate security safeguards.

## Cross-border transfers
Some of our service providers or systems may be located outside South Africa, and your personal information may be processed and stored in other jurisdictions. Where we transfer personal information across borders, we take the steps required by POPIA to ensure that the recipient is subject to a law, binding rules, contractual terms or other safeguards that provide an adequate level of protection. If you are outside South Africa, your information may be transferred to countries with different data-protection laws.

## Cookies and similar technologies
We use cookies and similar technologies to operate the website, remember preferences, analyse traffic and improve functionality. We use both session and persistent cookies, including analytics cookies, to understand and improve how the Services are used. You can control cookies through your browser settings, and where required we will request consent for non-essential cookies. Disabling some cookies may affect functionality. For more detail, see our Cookie Policy.

## Information security and breach notification
We take reasonable, appropriate technical and organisational measures to protect personal information against loss, damage, unauthorised access and unlawful processing, including access controls, encryption where appropriate, secure hosting, audit logging and per-company data scoping. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we become aware of a security compromise affecting your personal information, we will take the steps required by POPIA, including notifying affected data subjects and the Information Regulator where appropriate, as soon as reasonably possible.

## Retention
We retain personal information only for as long as necessary to fulfil the purposes for which it was collected, to comply with legal, accounting, regulatory or reporting requirements, to resolve disputes and to enforce agreements, after which we securely delete, destroy or de-identify it unless the law requires longer retention.

## Your rights
Subject to POPIA and applicable law, you have the right to:

- request confirmation of whether we hold personal information about you;
- request access to that information;
- request correction, deletion or destruction of inaccurate, irrelevant, excessive, out-of-date, incomplete, misleading or unlawfully obtained information;
- object, on reasonable grounds, to the processing of your personal information;
- object at any time to processing for direct marketing;
- withdraw consent where processing is based on consent;
- where applicable, request your information in a portable format; and
- lodge a complaint with the Information Regulator.

To exercise these rights, contact our Information Officer using the details below. We may need to verify your identity before responding.

## Direct marketing
We send electronic marketing only where permitted by law. You may opt out at any time using the unsubscribe mechanism in the message or by contacting us. Where consent is required for direct marketing by electronic communication, we will obtain it before sending.

## Children
The Services are not directed at children, and we do not knowingly collect personal information from children without the consent of a competent person or another lawful basis. If we become aware that we have collected such information unlawfully, we will take appropriate steps to delete it.

## Third-party links
Our website may link to third-party websites or services we do not control. Their privacy practices are governed by their own policies, and we are not responsible for them. Review their policies before providing personal information.

## Your responsibilities
You are responsible for ensuring that personal information you provide is accurate, complete and up to date. If you submit information about another person, you confirm that you have the authority or consent required to do so.

## Automated decision-making and profiling
Some Services use automated processing, including AI-based analysis, scoring, ranking or recommendations (for example in recruitment, matching or compliance features). AI-generated outputs are provided as decision-support only and should be independently reviewed and verified. Where a decision producing legal or similarly significant effects about you would be based solely on automated processing, we will not rely solely on that processing without a lawful basis, and you may request human review of, express your view on, or contest such a decision, as provided by applicable law.

## Your rights under the GDPR
If you are located in the European Economic Area (EEA) or the United Kingdom, the General Data Protection Regulation (GDPR) or the UK GDPR may apply to our processing of your personal data, in addition to POPIA. Where it applies:

- Our legal bases for processing are consent, the performance of a contract, compliance with a legal obligation, the protection of vital interests, the performance of a task in the public interest, or our or a third party's legitimate interests, as appropriate.
- You have the right to access, rectify, erase ("right to be forgotten"), restrict or object to the processing of your personal data, and the right to data portability.
- Where processing is based on consent, you may withdraw consent at any time without affecting processing carried out before withdrawal.
- You have the right not to be subject to a decision based solely on automated processing that produces legal or similarly significant effects, except as permitted by law.
- Where we transfer personal data outside the EEA or the UK, we use appropriate safeguards such as Standard Contractual Clauses or an adequacy decision.
- You have the right to lodge a complaint with your local data-protection supervisory authority.

If we are required to appoint an EU or UK representative under Article 27 of the GDPR, their details will be provided here: [insert EU/UK representative details, if applicable].

## Information Officer and contact details
For any question, request or complaint about this policy or our handling of personal information, contact our Information Officer:

- Responsible party: [insert registered company name]
- Information Officer: [insert Information Officer name]
- Email: [insert privacy contact email]
- Telephone: [insert telephone number]
- Registered address: [insert physical address]
- Company registration number: [insert CIPC registration number]

## Complaints to the Information Regulator
You have the right to lodge a complaint with the Information Regulator (South Africa). You can contact the Information Regulator at:

- General enquiries: enquiries@inforegulator.org.za
- POPIA complaints: POPIAComplaints@inforegulator.org.za
- Website: www.inforegulator.org.za

The Information Regulator's current physical address and other contact details are published on its official website.

## Changes to this policy
We may update this policy from time to time to reflect changes in our practices, the Services or the law. The current version is always available on our website, and the "last updated" date reflects the most recent changes. Continued use of the Services after an update constitutes acceptance of the revised policy.`;

const TERMS_BODY = `These Terms of Use ("Terms") govern your access to and use of Annix's websites, applications, products and services (together, the "Services"). By accessing or using the Services, you agree to be bound by these Terms. If you do not agree, you must not use the Services. Please read these Terms together with our Privacy Policy.

## Who we are and how to contact us
The Services are provided by Annix, a company incorporated in the Republic of South Africa ("Annix", "we", "us" or "our"). In accordance with the Electronic Communications and Transactions Act, 2002 ("ECTA"), our details are:

- Legal name: [insert registered company name]
- Registration number: [insert CIPC registration number]
- Physical address: [insert registered physical address]
- Email: [insert contact email]
- Telephone: [insert telephone number]

## Eligibility and age
You may use the Services only if you can form a binding contract with Annix and are not barred under applicable law. You must be at least 18 years old, or the age of majority in your jurisdiction, to create an account or transact. If you use the Services on behalf of an organisation, you confirm that you are authorised to bind that organisation to these Terms.

## Accounts and security
Some Services require an account. You are responsible for keeping your login credentials confidential and for all activity under your account, and you must not share credentials. You must notify us promptly of any unauthorised use. We may suspend or terminate accounts that are inactive, compromised, or used in breach of these Terms.

## Acceptable use
You agree not to:

- use the Services unlawfully or for any harmful, fraudulent, infringing or deceptive purpose;
- interfere with or disrupt the integrity, security or performance of the Services;
- attempt to gain unauthorised access to the Services, related systems or data;
- reverse engineer, decompile or copy any part of the Services except as permitted by law;
- scrape, harvest or extract data from the Services by automated means without our consent;
- share, resell or sublicense access, or use the Services to build or benchmark a competing product;
- upload malicious code, or content that is unlawful, that is discriminatory in breach of employment-equity or anti-discrimination law, or that infringes the rights of others;
- use the Services to send unsolicited communications or to misrepresent your identity; or
- use the Services in violation of applicable export-control, sanctions or trade laws.

## Customer Data and content
You retain ownership of the data and content you submit to the Services ("Customer Data"). You grant us a licence to host, process and use Customer Data as necessary to provide and improve the Services and as described in our Privacy Policy. You are responsible for ensuring that you have the rights and any necessary consents to provide Customer Data, including the personal information of third parties, and that it does not infringe any law or third-party right.

## Artificial intelligence outputs
Certain Services generate content, recommendations, analyses, scores, rankings, forecasts or other outputs using artificial-intelligence technologies. Such outputs are provided for informational purposes only, may contain errors, inaccuracies or omissions, and do not constitute professional advice. You remain solely responsible for independently reviewing and verifying all outputs before relying on or acting on them.

## Recruitment and workforce features
Where the Services facilitate recruitment, candidate ranking, CV analysis or workforce matching, Annix does not guarantee the suitability, qualifications, accuracy, performance or legality of any candidate, applicant, recruiter or employer. All hiring, employment and related decisions remain solely the responsibility of the relevant user, who is responsible for compliance with applicable employment, equity and data-protection laws.

## No professional advice
Information provided through the Services, including compliance, regulatory, tax, financial, engineering or standards-related information, does not constitute legal, regulatory, tax, accounting, employment, engineering or other professional advice. You should obtain independent professional advice regarding your specific circumstances before acting.

## Intellectual property
The Services, including all software, text, graphics, logos and other content (excluding Customer Data), are owned by or licensed to Annix and are protected by intellectual-property laws. We grant you a limited, non-exclusive, non-transferable, revocable right to use the Services for their intended purpose, subject to these Terms. No other rights are granted.

## Feedback
If you submit feedback, suggestions, enhancement requests or other recommendations to us, we may use them without restriction, attribution or compensation to you.

## Beta and experimental features
Certain features may be designated as beta, preview or experimental. They may be incomplete, may change, and may be modified, suspended or discontinued at any time, and are provided "as is" without warranties of any kind.

## Third-party services
The Services may integrate with or link to third-party products and services, including cloud-hosting and AI providers. We are not responsible for third-party services, and your use of them is governed by their own terms and policies.

## Fees, subscriptions and payment
Some Services are or may become paid. Where they are, the applicable pricing, billing cycles, taxes (including VAT where applicable), renewals, cancellations and refunds will be set out at the point of sale or in a separate agreement. Unless otherwise stated, fees are payable in advance and are non-refundable except as required by law. We may suspend or terminate paid Services for non-payment. Where the Consumer Protection Act, 2008 or ECTA grants you a cooling-off or cancellation right in respect of a transaction, that right applies and is not limited by these Terms.

## Service availability and changes
We aim to keep the Services available and reliable, but provide them on an "as is" and "as available" basis. We may modify, suspend or discontinue any part of the Services at any time. Additional or different terms may apply to specific products or paid Services in a separate agreement (for example a Master Services Agreement), which will prevail over these Terms to the extent of any conflict.

## Privacy and data protection
We process personal information in accordance with applicable data-protection law, including the Protection of Personal Information Act, 2013 ("POPIA") and, where applicable, other privacy laws. You acknowledge that personal information may be processed, stored and transferred as described in our Privacy Policy. Where personal information is transferred outside South Africa, we take the steps required by POPIA to ensure an adequate level of protection.

## Security
We implement reasonable, appropriate technical and organisational security measures, but no system can be guaranteed completely secure. You acknowledge the inherent risks of internet-based services and are responsible for maintaining the security of your own systems and credentials.

## Disclaimers
To the maximum extent permitted by law, the Services are provided without warranties of any kind, whether express or implied, including any implied warranties of merchantability, fitness for a particular purpose, accuracy or non-infringement. We do not warrant that the Services will be uninterrupted, error-free or secure. Nothing in these Terms excludes or limits any rights you may have under the Consumer Protection Act, 2008 or other applicable law that cannot lawfully be excluded.

## Limitation of liability
To the maximum extent permitted by law, Annix will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, revenue, data or goodwill, arising out of or relating to your use of the Services. To the extent our liability cannot be excluded, our aggregate liability shall not exceed the total fees paid by you for the relevant Service during the twelve months preceding the event giving rise to the claim, or, where no fee was paid, a reasonable amount determined in accordance with law.

## Indemnity
You agree to indemnify and hold Annix harmless against claims, losses and expenses arising from your breach of these Terms, your misuse of the Services, or your Customer Data, to the extent permitted by law.

## Force majeure
Annix shall not be liable for any delay or failure to perform resulting from causes beyond its reasonable control, including acts of God, natural disasters, power or internet failures, labour disputes, governmental actions, cyberattacks, or the failure of third-party providers.

## Electronic communications
You consent to receiving communications from us electronically, and you agree that electronic communications, agreements and notices satisfy any legal requirement that such communications be in writing.

## Suspension and termination
We may suspend or terminate your access to the Services if you breach these Terms or where necessary to protect the Services, other users or third parties. You may stop using the Services at any time. Provisions that by their nature should survive termination will continue to apply.

## Dispute resolution
The parties will attempt to resolve any dispute amicably and in good faith before resorting to formal proceedings, and may agree to refer a dispute to mediation. This clause does not prevent either party from seeking urgent interim relief from a competent court.

## Governing law and jurisdiction
These Terms are governed by the laws of the Republic of South Africa. You submit to the non-exclusive jurisdiction of the South African courts in relation to any dispute arising out of or in connection with these Terms or the Services.

## Changes to these Terms
We may update these Terms from time to time. The current version is always available on our website and the "last updated" date reflects the most recent changes. Your continued use of the Services after changes take effect constitutes acceptance of the updated Terms.

## General
If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force. Our failure to enforce a provision is not a waiver of it. You may not assign these Terms without our consent; we may assign them as part of a corporate transaction. These Terms, together with any product-specific agreement and our Privacy Policy, constitute the entire agreement between you and Annix regarding the Services.

## Contact
Questions about these Terms can be sent to us using the contact details set out above or on our Contact page.`;

const COOKIES_BODY = `This Cookie Policy explains how Annix ("Annix", "we", "us" or "our") uses cookies and similar technologies on our websites and related online services. It should be read together with our Privacy Policy.

## What cookies are
Cookies are small text files placed on your device when you visit a website. They help the website function properly, improve security, remember preferences and understand how visitors use the site. Similar technologies may include pixels, tags, local storage and analytics scripts.

## Types of cookies we use
We may use the following categories of cookies:

- Strictly necessary cookies — required for the website to operate and cannot usually be switched off. They support core functions such as navigation, security and form submission.
- Functional cookies — remember your preferences and settings, such as language or form inputs, to improve your experience.
- Analytics cookies — help us understand how visitors use our website, which pages are visited, and how the site can be improved.
- Marketing cookies — may be used to measure the effectiveness of campaigns or deliver relevant advertising, where applicable and permitted by law.

## Why we use cookies
We use cookies and similar technologies to operate and secure the website, remember your preferences, improve performance and user experience, analyse website traffic and usage patterns, support troubleshooting and diagnostics, and, where enabled, support marketing activities.

## Legal basis for non-essential cookies
Where required by law, we will only place non-essential cookies, such as analytics or marketing cookies, after obtaining your consent. Strictly necessary cookies may be used without consent because they are required for the website to function.

## Third-party cookies
Some cookies may be set by third-party service providers we use for hosting, analytics, performance monitoring, communications or other services. These third parties may collect information about your use of our website in accordance with their own privacy and cookie policies.

## Managing cookies
You can manage or disable cookies through your browser settings. Most browsers allow you to block, delete or control cookies. If you disable certain cookies, some parts of the website may not function properly. Where available, you may also use a cookie banner or settings tool on our website to manage your consent preferences for non-essential cookies.

## Retention
Cookies may be either session cookies, which expire when you close your browser, or persistent cookies, which remain on your device for a set period or until deleted. The exact retention period depends on the type of cookie used.

## Cookies we use
We maintain a current list of the specific cookies and similar technologies used on our website. As we add or change analytics, functionality or marketing tools, this list is updated. At present we use a strictly necessary preference cookie to remember your cookie choices. Where additional analytics or marketing technologies are introduced, they will be described here and, where required, used only after you have given consent through our cookie banner.

## Changes to this policy
We may update this Cookie Policy from time to time to reflect changes in our use of cookies, applicable law or our Services. The updated version will be posted on this page with a revised "last updated" date.

## Contact us
If you have any questions about this Cookie Policy or our use of cookies, please contact us using the details on our Contact page or in our Privacy Policy.`;

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
        { platform: "LinkedIn", href: "https://www.linkedin.com/company/126324129/" },
        { platform: "Facebook", href: "https://www.facebook.com/profile.php?id=61590388749937" },
        { platform: "YouTube", href: "https://www.youtube.com/@AnnixInvestments" },
        { platform: "Instagram", href: "https://www.instagram.com/annixinvestments" },
      ],
      legalLinks: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
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
      cookies: {
        heading: "Cookie Policy",
        lastUpdated: "3 June 2026",
        body: COOKIES_BODY,
      },
    },
  };
}
