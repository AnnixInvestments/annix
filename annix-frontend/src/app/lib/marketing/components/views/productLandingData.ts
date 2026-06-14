export interface LandingItem {
  iconKey: string;
  title: string;
  blurb: string;
}

export interface LandingPortal {
  iconKey: string;
  name: string;
  badge: string;
  blurb: string;
  tagline?: string;
  features?: string[];
}

export interface LandingStat {
  label: string;
  value: string;
  delta: string;
  iconKey?: string;
}

export interface LandingStripItem {
  iconKey: string;
  title: string;
  subtitle: string;
}

export interface ProductLandingConfig {
  wordmark: string;
  eyebrow: string;
  headlineLead: string;
  headlineEmphasis: string;
  subheading: string;
  primaryCta: string;
  secondaryCta: string;
  heroStats: LandingStat[];
  features: LandingItem[];
  gridTitle: string;
  gridKind: "cards" | "portals";
  cards: LandingItem[];
  portals: LandingPortal[];
  stripTitle: string;
  strip: LandingStripItem[];
  ctaHeadline: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
  heroImage?: string;
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
  modulesEyebrow?: string;
  modulesHeadlineLead?: string;
  modulesHeadlineEmphasis?: string;
  whyEyebrow?: string;
  whyHeadlineLead?: string;
  whyHeadlineEmphasis?: string;
  whyBody?: string;
  whyCta?: string;
  whyCtaHref?: string;
  whyFeatures?: LandingItem[];
}

export const DEFAULT_PRODUCT_HERO_IMAGE = "/branding/annix-investments-hero-top.webp";

const FORGE: ProductLandingConfig = {
  wordmark: "Forge",
  eyebrow: "Quote · Build · Inspect · Deliver",
  headlineLead: "Where industrial projects",
  headlineEmphasis: "take shape.",
  subheading:
    "Standards-aware quoting for piping and fabrication. RFQs, BOQs and weld-aware pricing built around ASME, API, NACE and SANS engineering standards.",
  primaryCta: "Explore Forge",
  secondaryCta: "Request a Demo",
  heroStats: [
    { label: "Total RFQs", value: "128", delta: "+16% vs last month" },
    { label: "Active BOQs", value: "64", delta: "+12% vs last month" },
    { label: "Quotes Received", value: "96", delta: "+24% vs last month" },
    { label: "Projects Awarded", value: "28", delta: "+15% vs last month" },
  ],
  features: [
    {
      iconKey: "filePlus",
      title: "Raise & Manage RFQs",
      blurb:
        "Create detailed RFQs with drawings, specs and documents. Track status from draft to award.",
    },
    {
      iconKey: "list",
      title: "BOQ Consolidation",
      blurb:
        "Automatically consolidate RFQ items into BOQs with weld lengths, coating areas and quantities.",
    },
    {
      iconKey: "users",
      title: "Supplier Collaboration",
      blurb:
        "Share BOQs securely with qualified suppliers and manage clarifications and communications.",
    },
    {
      iconKey: "receipt",
      title: "Quote & Price",
      blurb:
        "Suppliers price BOQs with built-in weld math, material, labour and engineering allowances.",
    },
    {
      iconKey: "shield",
      title: "Award & Deliver",
      blurb: "Compare quotes, award projects and move forward with confidence and full visibility.",
    },
    {
      iconKey: "chart",
      title: "Analytics & Reports",
      blurb: "Real-time insights, pipeline tracking, reports and performance dashboards.",
    },
  ],
  gridTitle: "Two portals. One powerful platform.",
  gridKind: "portals",
  cards: [],
  portals: [
    {
      iconKey: "users",
      name: "Customer Portal",
      badge: "Raise & Manage RFQs",
      blurb:
        "Create RFQs, upload drawings, manage suppliers, track clarifications and view all project activity.",
    },
    {
      iconKey: "hardHat",
      name: "Supplier Portal",
      badge: "Price & Quote BOQs",
      blurb: "View BOQs, perform weld-aware pricing, submit quotes and manage your pipeline.",
    },
  ],
  stripTitle: "Engineered for accuracy. Built on global standards.",
  strip: [
    { iconKey: "flange", title: "ASME B16.5", subtitle: "Flange ratings Class 150–2500" },
    { iconKey: "pipe", title: "API 5L", subtitle: "PSL1 / PSL2 pipe specifications" },
    { iconKey: "droplet", title: "NACE MR0175", subtitle: "ISO 15156 sour service" },
    { iconKey: "pvc", title: "SANS 966", subtitle: "uPVC, mPVC, PVC-O, cPVC piping" },
    {
      iconKey: "weld",
      title: "Weld Calculations",
      subtitle: "Auto weld lengths, coating areas & joint factors",
    },
    { iconKey: "layers", title: "Materials", subtitle: "Steel · HDPE · PVC & more" },
    {
      iconKey: "activity",
      title: "NDT & Testing",
      subtitle: "RT · UT · MT · PT · VT, hydrotest & more",
    },
  ],
  ctaHeadline: "Ready to streamline your quoting process?",
  ctaBody:
    "Annix Forge helps you quote engineering work with confidence and deliver industrial projects on time and on spec.",
  ctaPrimary: "Request a Demo",
  ctaSecondary: "Contact Us",
};

const SENTINEL: ProductLandingConfig = {
  wordmark: "Sentinel",
  eyebrow: "Monitor · Detect · Protect · Improve",
  headlineLead: "Compliance you can",
  headlineEmphasis: "prove.",
  subheading:
    "AI-powered compliance & risk intelligence. Ensure compliance, manage risk and keep your business audit-ready with secure document workflows.",
  primaryCta: "Start Free Trial",
  secondaryCta: "Book a Demo",
  heroStats: [
    { label: "Compliance Score", value: "82%", delta: "+12% vs last month" },
    { label: "Requirements", value: "128", delta: "96 completed" },
    { label: "Documents", value: "256", delta: "All up to date" },
    { label: "Upcoming Deadlines", value: "7", delta: "Next: 14 May" },
  ],
  features: [
    {
      iconKey: "clipboard",
      title: "Track Compliance",
      blurb: "Match SA regulations to your business and track progress in real time.",
    },
    {
      iconKey: "lock",
      title: "Secure Documents",
      blurb: "Upload, store and manage documents with AI-powered analysis and audit trails.",
    },
    {
      iconKey: "alert",
      title: "Manage Risk",
      blurb: "Identify risks, monitor status and get proactive alerts before deadlines.",
    },
    {
      iconKey: "calculator",
      title: "Tax & B-BBEE Tools",
      blurb: "Powerful calculators, scorecards and grants to keep you compliant and competitive.",
    },
    {
      iconKey: "building",
      title: "Regulatory Intelligence",
      blurb: "Daily updates from SARS, CIPC and Gazette with AI-powered insights.",
    },
    {
      iconKey: "users",
      title: "Advisor & Reporting",
      blurb: "Multi-client oversight, reports and audit-ready health checks.",
    },
  ],
  gridTitle: "Comprehensive compliance & governance platform",
  gridKind: "cards",
  cards: [
    {
      iconKey: "shieldCheck",
      title: "Compliance Dashboard",
      blurb: "Track requirements, checklist progress, risks and deadlines in one unified view.",
    },
    {
      iconKey: "lock",
      title: "Document Vault & AI Analysis",
      blurb:
        "Secure storage with AI that automatically matches evidence to compliance requirements.",
    },
    {
      iconKey: "users",
      title: "B-BBEE Scorecard",
      blurb: "Manage elements, calculate scores and determine your B-BBEE level.",
    },
    {
      iconKey: "calculator",
      title: "Tax Tools & Calendar",
      blurb: "VAT, corporate tax, minimum wage, SDL, UIF calculators and deadline calendar.",
    },
    {
      iconKey: "building",
      title: "Regulatory Monitoring",
      blurb: "AI-powered daily updates from SARS, CIPC and Government Gazette.",
    },
    {
      iconKey: "clipboard",
      title: "Tender Readiness",
      blurb: "Readiness checklist, scoring and documentation to win more tenders.",
    },
    {
      iconKey: "users",
      title: "Advisor Workspace",
      blurb: "Manage multiple clients, schedule meetings and generate reports.",
    },
    {
      iconKey: "brain",
      title: "AI Assistant (Nix Powered)",
      blurb: "Ask compliance questions and get intelligent, grounded answers instantly.",
    },
  ],
  portals: [],
  stripTitle: "Built for South Africa. Aligned to global standards.",
  strip: [
    { iconKey: "shield", title: "POPIA", subtitle: "Data protection" },
    { iconKey: "building", title: "KING IV", subtitle: "Governance" },
    { iconKey: "award", title: "ISO 9001", subtitle: "Quality" },
    { iconKey: "leaf", title: "ISO 14001", subtitle: "Environment" },
    { iconKey: "shieldCheck", title: "ISO 45001", subtitle: "Health & safety" },
    { iconKey: "scale", title: "SANS", subtitle: "South African standards" },
    { iconKey: "receipt", title: "SARS", subtitle: "SA Revenue Service" },
    { iconKey: "building", title: "CIPC", subtitle: "Companies & IP Commission" },
    { iconKey: "users", title: "B-BBEE Act", subtitle: "Codes of Good Practice" },
    { iconKey: "file", title: "Gazette", subtitle: "Government Gazette" },
  ],
  ctaHeadline: "Ready to get your business audit-ready?",
  ctaBody:
    "Join thousands of South African businesses ensuring compliance and building a stronger, more resilient future.",
  ctaPrimary: "Start Free Trial",
  ctaSecondary: "Book a Demo",
};

const ORBIT: ProductLandingConfig = {
  wordmark: "Orbit",
  eyebrow: "Our Products",
  headlineLead: "One Platform. Every",
  headlineEmphasis: "Opportunity.",
  subheading:
    "Annix Orbit is an intelligent workforce ecosystem that connects seekers, recruiters, companies and students to real opportunities.",
  primaryCta: "Get Started",
  secondaryCta: "Book a Demo",
  primaryCtaHref: "/annix/orbit/seeker/register-interest",
  heroImage: DEFAULT_PRODUCT_HERO_IMAGE,
  modulesEyebrow: "Four powerful modules. One seamless platform.",
  modulesHeadlineLead: "Built for",
  modulesHeadlineEmphasis: "every player",
  whyEyebrow: "Why Annix Orbit?",
  whyHeadlineLead: "AI-Powered. Human Focused.",
  whyHeadlineEmphasis: "Results Driven.",
  whyBody:
    "We combine artificial intelligence with human insight to create meaningful connections that drive real results.",
  whyCta: "Explore Platform",
  whyFeatures: [
    {
      iconKey: "brain",
      title: "AI-Powered Matching",
      blurb: "Advanced algorithms match the right talent with the right opportunities.",
    },
    {
      iconKey: "shieldCheck",
      title: "Secure & Compliant",
      blurb: "Enterprise-grade security with built-in compliance.",
    },
    {
      iconKey: "route",
      title: "End-to-End Workflow",
      blurb: "From discovery to placement, manage everything in one place.",
    },
    {
      iconKey: "layers",
      title: "Scalable for Growth",
      blurb: "Built to scale with your team, your company and your goals.",
    },
    {
      iconKey: "chart",
      title: "Data-Driven Insights",
      blurb: "Real-time analytics to make smarter hiring decisions.",
    },
    {
      iconKey: "users",
      title: "Support that Cares",
      blurb: "Real people. Real support. Real results.",
    },
  ],
  heroStats: [
    { iconKey: "users", label: "Active Users", value: "10K+", delta: "" },
    { iconKey: "briefcase", label: "Jobs Posted", value: "5K+", delta: "" },
    { iconKey: "building", label: "Companies", value: "1K+", delta: "" },
    { iconKey: "star", label: "Match Accuracy", value: "95%", delta: "" },
  ],
  features: [
    {
      iconKey: "brain",
      title: "Smart Matching",
      blurb: "AI-powered matching using skills, experience, location and work profile insights.",
    },
    {
      iconKey: "chart",
      title: "Job Market Intelligence",
      blurb: "Real-time job ingestion from 20+ sources and salary benchmarks across South Africa.",
    },
    {
      iconKey: "users",
      title: "Recruitment Solutions",
      blurb:
        "End-to-end hiring tools, interview scheduling, references and analytics for employers.",
    },
    {
      iconKey: "shield",
      title: "EE Compliance",
      blurb: "Employment Equity reporting, sectoral targets and POPIA compliance built-in.",
    },
    {
      iconKey: "graduation",
      title: "Education Pathways",
      blurb: "FuturePath guides students with subject planning, career fits and funding options.",
    },
    {
      iconKey: "lock",
      title: "Secure & Compliant",
      blurb: "POPIA compliant, data secure and private by design for all user types.",
    },
  ],
  gridTitle: "Four portals. One ecosystem.",
  gridKind: "portals",
  cards: [],
  portals: [
    {
      iconKey: "user",
      name: "Seeker",
      badge: "Find Your Next Opportunity",
      tagline: "Find the right job. Build your future.",
      blurb: "AI-powered tools to help you stand out, match smart and advance your career.",
      features: [
        "AI CV Review & Improvement",
        "Career Score",
        "Smart Job Matching",
        "Interview Coach",
        "Application Tracking",
        "Skills & Career Guidance",
      ],
    },
    {
      iconKey: "users",
      name: "Recruiter",
      badge: "Staffing Made Easy",
      tagline: "Find the right talent. Faster.",
      blurb:
        "Intelligent recruitment tools to source, match and manage top candidates efficiently.",
      features: [
        "Candidate Search & Match",
        "Talent Pools",
        "Shortlists & Submissions",
        "Interview Management",
        "Placement Tracking",
        "Client & Job Management",
      ],
    },
    {
      iconKey: "briefcase",
      name: "Company",
      badge: "Hire Top Talent",
      tagline: "Hire smarter. Grow faster.",
      blurb: "Streamlined hiring solutions to attract, engage and hire the best talent.",
      features: [
        "Job Posting & Management",
        "AI Candidate Matching",
        "Candidate Ranking",
        "Interview Management",
        "Talent Pipeline",
        "Analytics & Insights",
      ],
    },
    {
      iconKey: "graduation",
      name: "Student",
      badge: "Plan Your Future",
      tagline: "Learn. Grow. Get career ready.",
      blurb:
        "Everything students need to build skills, discover opportunities and launch their careers.",
      features: [
        "Career Guidance",
        "Skills Development",
        "Internships & Jobs",
        "AI Career Coach",
        "CV Builder",
        "University Finder",
      ],
    },
  ],
  stripTitle: "Powered by AI & real-time data",
  strip: [
    {
      iconKey: "brain",
      title: "Gemini AI",
      subtitle: "CV extraction, job categorization & smart insights",
    },
    { iconKey: "refresh", title: "Daily Updates", subtitle: "20+ job sources ingested hourly" },
    {
      iconKey: "signal",
      title: "Smart Signals",
      subtitle: "AI matching with 5-factor scoring engine",
    },
    {
      iconKey: "lock",
      title: "Privacy First",
      subtitle: "POPIA compliant and data protection by design",
    },
  ],
  ctaHeadline: "Ready to accelerate your career or hiring?",
  ctaBody: "Join thousands of employers, job seekers, recruiters and students on Annix Orbit.",
  ctaPrimary: "Create Free Account",
  ctaSecondary: "Contact Sales",
};

const INSIGHTS: ProductLandingConfig = {
  wordmark: "Insights",
  eyebrow: "Analyze · Invest · Monitor · Grow",
  headlineLead: "Turn market data into smarter",
  headlineEmphasis: "investment decisions.",
  subheading:
    "A private, AI-powered investment-intelligence and paper-trading test harness. Discover opportunities, score signals, and compare strategies with real-time data and AI.",
  primaryCta: "Request Access",
  secondaryCta: "Learn More",
  heroStats: [
    { label: "Global Markets", value: "+0.62%", delta: "24h change" },
    { label: "VIX", value: "16.32", delta: "-4.95%" },
    { label: "Fear & Greed", value: "62", delta: "Greed" },
    { label: "USD / ZAR", value: "18.72", delta: "-2.14%" },
  ],
  features: [
    {
      iconKey: "shield",
      title: "Private & Secure",
      blurb: "Access restricted. No public registration.",
    },
    { iconKey: "cpu", title: "AI-Powered", blurb: "Gemini-driven news analysis and signals." },
    { iconKey: "clock", title: "Daily Pipeline", blurb: "06:00 SAST data ingest & scoring." },
    { iconKey: "chart", title: "Paper Trading", blurb: "6 portfolios. Fake money. Real insights." },
  ],
  gridTitle: "Everything you need to test your edge",
  gridKind: "cards",
  cards: [
    {
      iconKey: "star",
      title: "Asset Watchlists",
      blurb: "Track stocks, ETFs, commodities, indices, crypto & forex.",
    },
    {
      iconKey: "signal",
      title: "Signal Engine",
      blurb: "5-factor scoring: momentum, valuation, sentiment, trend, drawdown risk.",
    },
    {
      iconKey: "brain",
      title: "AI Portfolios",
      blurb: "AI Pure, AI Override and AI Picker strategies powered by Gemini.",
    },
    {
      iconKey: "file",
      title: "News Intelligence",
      blurb: "AI-extracted events, sentiment and impact with source provenance.",
    },
    {
      iconKey: "chart",
      title: "Performance Analytics",
      blurb: "Compare returns, risk, drawdowns and exposures.",
    },
    {
      iconKey: "download",
      title: "Reports & Exports",
      blurb: "Snapshots, trades and reports for deeper analysis.",
    },
  ],
  portals: [],
  stripTitle: "Built for investors & researchers",
  strip: [
    { iconKey: "shield", title: "Private & Secure", subtitle: "Access controlled" },
    { iconKey: "ban", title: "No Public Registration", subtitle: "Invite only" },
    { iconKey: "building", title: "Company Scoped", subtitle: "Access by company" },
    { iconKey: "lock", title: "POPIA Compliant", subtitle: "Data protected" },
    { iconKey: "cpu", title: "AI-Powered", subtitle: "Gemini & Google Cloud" },
    { iconKey: "star", title: "For Serious Investors", subtitle: "Real-time + backtests" },
  ],
  ctaHeadline: "Ready to unlock smarter investment intelligence?",
  ctaBody: "Request private access to Annix Insights and start making data-driven decisions.",
  ctaPrimary: "Request Access",
  ctaSecondary: "Learn More",
};

const NEXUS: ProductLandingConfig = {
  wordmark: "Nexus",
  eyebrow: "One AI gateway · Every model · Infinite possibilities",
  headlineLead: "The AI orchestration platform for the",
  headlineEmphasis: "Annix ecosystem.",
  subheading:
    "Annix Nexus is the central AI gateway that powers every Annix application. One integration. Multiple models. Unlimited potential.",
  primaryCta: "Request Access",
  secondaryCta: "Explore Platform",
  heroStats: [
    { label: "Total Requests", value: "2.48M", delta: "+18.6% vs last 7 days" },
    { label: "Success Rate", value: "99.62%", delta: "+0.31%" },
    { label: "Avg Response Time", value: "1.24s", delta: "-0.18s" },
    { label: "Active Models", value: "12", delta: "of 15 enabled" },
  ],
  features: [
    { iconKey: "cpu", title: "Multi-Model", blurb: "Gemini, Claude, OpenAI & more." },
    {
      iconKey: "shield",
      title: "Secure & Private",
      blurb: "Enterprise security, full data control.",
    },
    { iconKey: "route", title: "Smart Routing", blurb: "Auto-select the best model for the job." },
    { iconKey: "chart", title: "Usage Insights", blurb: "Real-time analytics & cost tracking." },
  ],
  gridTitle: "Why Annix Nexus powers everything",
  gridKind: "cards",
  cards: [
    { iconKey: "cloud", title: "Unified Access", blurb: "One API. All models. No vendor lock-in." },
    {
      iconKey: "brain",
      title: "Intelligent Routing",
      blurb: "Auto-route to the best model for each task.",
    },
    {
      iconKey: "dollar",
      title: "Cost Optimisation",
      blurb: "Smart model selection reduces costs.",
    },
    { iconKey: "lock", title: "Enterprise Security", blurb: "Your data stays private and secure." },
    {
      iconKey: "shieldCheck",
      title: "Scalable & Reliable",
      blurb: "Built for scale with 99.9% uptime.",
    },
    {
      iconKey: "eye",
      title: "Observability",
      blurb: "Deep insights into usage, performance & costs.",
    },
  ],
  portals: [],
  stripTitle: "Supported AI providers",
  strip: [
    { iconKey: "cpu", title: "Google Gemini", subtitle: "Vision & text" },
    { iconKey: "brain", title: "Claude", subtitle: "Reasoning" },
    { iconKey: "cpu", title: "OpenAI", subtitle: "GPT models" },
    { iconKey: "cpu", title: "Meta Llama", subtitle: "Open weights" },
    { iconKey: "cpu", title: "Mistral AI", subtitle: "Efficient models" },
    { iconKey: "cpu", title: "Gemma", subtitle: "Lightweight" },
  ],
  ctaHeadline: "Ready to unlock the power of unified AI?",
  ctaBody: "Join the Annix ecosystem and build the future with Annix Nexus.",
  ctaPrimary: "Request Access",
  ctaSecondary: "View Documentation",
};

const CORE: ProductLandingConfig = {
  wordmark: "Core",
  eyebrow: "Industrial operations, under control",
  headlineLead: "The operations platform for stock, production, documents, quality, and",
  headlineEmphasis: "delivery.",
  subheading:
    "Source, produce, track, and deliver with confidence. Annix Core unifies shop-floor operations across inventory, quality, traceability and documents.",
  primaryCta: "Explore Annix Core",
  secondaryCta: "Learn More",
  heroStats: [],
  features: [
    {
      iconKey: "refresh",
      title: "Connected Operations",
      blurb: "Two specialist apps. One connected ecosystem.",
    },
    {
      iconKey: "layers",
      title: "Single Source of Truth",
      blurb: "Shared masters, consistent data, complete traceability.",
    },
    {
      iconKey: "boxes",
      title: "Built for the Floor",
      blurb: "Designed for real-world industrial environments.",
    },
    {
      iconKey: "shield",
      title: "Compliance Ready",
      blurb: "Audit trails, certifications and regulatory alignment.",
    },
    {
      iconKey: "chart",
      title: "Scalable & Flexible",
      blurb: "Grow across sites, teams and business units.",
    },
    { iconKey: "brain", title: "AI-Powered", blurb: "Nix extraction, insights and automation." },
  ],
  gridTitle: "One platform. Two powerful operations apps.",
  gridKind: "portals",
  cards: [],
  portals: [],
  stripTitle: "Powered by the Annix platform",
  strip: [
    { iconKey: "shield", title: "Branding & Theming", subtitle: "Per-app brand system" },
    { iconKey: "lock", title: "RBAC & Permissions", subtitle: "Role-based access" },
    { iconKey: "receipt", title: "Licensing", subtitle: "Subscriptions & plans" },
    { iconKey: "clipboard", title: "Audit Logs", subtitle: "Compliance trails" },
    { iconKey: "brain", title: "Nix AI", subtitle: "Document extraction" },
    { iconKey: "building", title: "Storage & Email", subtitle: "Notifications" },
    { iconKey: "activity", title: "Metrics & Jobs", subtitle: "Monitoring" },
    { iconKey: "layers", title: "MongoDB Live", subtitle: "Dual-driver persistence" },
  ],
  ctaHeadline: "Ready to unify your operations?",
  ctaBody: "Connect your stock, quality, documents and delivery in one intelligent ecosystem.",
  ctaPrimary: "Request Access",
  ctaSecondary: "Contact Sales",
};

export const PRODUCT_LANDING_CONFIGS: Record<string, ProductLandingConfig> = {
  "annix-core": CORE,
  "annix-forge": FORGE,
  "annix-sentinel": SENTINEL,
  "annix-orbit": ORBIT,
  "annix-insights": INSIGHTS,
  "annix-nexus": NEXUS,
};
