export const JOB_CATEGORY_KEYS = [
  "engineering-technical",
  "mining-resources",
  "construction",
  "skilled-trades",
  "manufacturing-production",
  "energy-utilities",
  "finance-accounting",
  "it-software",
  "science-research",
  "healthcare-medical",
  "education-training",
  "sales-marketing",
  "admin-office",
  "logistics-supply-chain",
  "driving-transport",
  "hospitality-tourism",
  "retail",
  "legal",
  "hr-recruitment",
  "customer-service",
  "security",
  "agriculture",
  "government-public-sector",
  "media-creative",
  "other",
] as const;

export type JobCategoryKey = (typeof JOB_CATEGORY_KEYS)[number];

export const OTHER_JOB_CATEGORY: JobCategoryKey = "other";

export interface JobCategory {
  key: JobCategoryKey;
  label: string;
  keywords: string[];
  providerAliases: string[];
}

export const JOB_CATEGORIES: JobCategory[] = [
  {
    key: "mining-resources",
    label: "Mining & Resources",
    keywords: [
      "mine",
      "mining",
      "underground",
      "shaft",
      "geologist",
      "metallurg",
      "rock engineer",
      "blasting",
      "beneficiation",
      "smelter",
      "ore",
      "colliery",
    ],
    providerAliases: ["mining", "mining-jobs", "resources", "extraction"],
  },
  {
    key: "skilled-trades",
    label: "Skilled Trades",
    keywords: [
      "boilermaker",
      "welder",
      "welding",
      "fitter",
      "turner",
      "millwright",
      "rigger",
      "electrician",
      "plumber",
      "diesel mechanic",
      "auto electrician",
      "instrumentation",
      "artisan",
      "red seal",
      "fabricator",
      "pipe fitter",
      "scaffolder",
    ],
    providerAliases: [
      "trade-construction-jobs",
      "skilled-trades",
      "trades",
      "trade-jobs",
      "maintenance-jobs",
    ],
  },
  {
    key: "engineering-technical",
    label: "Engineering & Technical",
    keywords: [
      "engineer",
      "engineering",
      "mechanical",
      "electrical engineer",
      "civil",
      "structural",
      "chemical engineer",
      "industrial engineer",
      "draughtsman",
      "draughtsperson",
      "technologist",
      "technician",
      "cad",
    ],
    providerAliases: ["engineering-jobs", "engineering", "graduate-jobs"],
  },
  {
    key: "construction",
    label: "Construction",
    keywords: [
      "construction",
      "site agent",
      "site manager",
      "quantity surveyor",
      "foreman",
      "civil works",
      "bricklayer",
      "plasterer",
      "carpenter",
      "building",
    ],
    providerAliases: ["construction-jobs", "construction", "property-jobs"],
  },
  {
    key: "manufacturing-production",
    label: "Manufacturing & Production",
    keywords: [
      "manufacturing",
      "production",
      "factory",
      "assembly",
      "machine operator",
      "process operator",
      "plant operator",
      "quality control",
      "shift supervisor",
    ],
    providerAliases: ["manufacturing-jobs", "manufacturing", "production"],
  },
  {
    key: "energy-utilities",
    label: "Energy & Utilities",
    keywords: [
      "oil",
      "gas",
      "petroleum",
      "renewable",
      "solar",
      "power station",
      "utilities",
      "water treatment",
      "energy",
    ],
    providerAliases: ["energy-oil-gas-jobs", "energy", "oil-gas", "utilities"],
  },
  {
    key: "finance-accounting",
    label: "Finance & Accounting",
    keywords: [
      "accountant",
      "accounting",
      "bookkeeper",
      "finance",
      "financial",
      "auditor",
      "audit",
      "tax",
      "creditors",
      "debtors",
      "payroll",
      "cfo",
      "treasury",
      "actuar",
    ],
    providerAliases: [
      "accounting-finance-jobs",
      "finance",
      "finance / legal",
      "accounting",
      "banking",
    ],
  },
  {
    key: "it-software",
    label: "IT & Software",
    keywords: [
      "software",
      "developer",
      "programmer",
      "data scientist",
      "data engineer",
      "devops",
      "sysadmin",
      "network",
      "cyber",
      "it support",
      "full stack",
      "frontend",
      "backend",
      "qa engineer",
      "cloud",
    ],
    providerAliases: ["it-jobs", "software development", "devops / sysadmin", "data", "it", "tech"],
  },
  {
    key: "science-research",
    label: "Science & Research",
    keywords: [
      "scientist",
      "laboratory",
      "lab technician",
      "research",
      "chemist",
      "biolog",
      "microbiolog",
      "analyst chemist",
    ],
    providerAliases: ["scientific-qa-jobs", "science", "research"],
  },
  {
    key: "healthcare-medical",
    label: "Healthcare & Medical",
    keywords: [
      "nurse",
      "nursing",
      "doctor",
      "medical",
      "clinical",
      "pharmacist",
      "pharmacy",
      "radiographer",
      "physiotherap",
      "paramedic",
      "caregiver",
      "dental",
      "healthcare",
    ],
    providerAliases: ["healthcare-nursing-jobs", "healthcare", "medical", "health"],
  },
  {
    key: "education-training",
    label: "Education & Training",
    keywords: [
      "teacher",
      "lecturer",
      "tutor",
      "educator",
      "training",
      "facilitator",
      "principal",
      "academic",
      "curriculum",
    ],
    providerAliases: ["teaching-jobs", "education", "teaching", "training"],
  },
  {
    key: "sales-marketing",
    label: "Sales & Marketing",
    keywords: [
      "sales",
      "marketing",
      "business development",
      "account manager",
      "brand",
      "digital marketing",
      "seo",
      "merchandiser",
      "key account",
    ],
    providerAliases: ["sales-jobs", "pr-advertising-marketing-jobs", "sales", "marketing"],
  },
  {
    key: "admin-office",
    label: "Admin & Office Support",
    keywords: [
      "administrator",
      "admin",
      "receptionist",
      "secretary",
      "personal assistant",
      "office manager",
      "data capturer",
      "clerk",
      "filing",
    ],
    providerAliases: ["admin-jobs", "admin", "office", "pa-secretarial"],
  },
  {
    key: "logistics-supply-chain",
    label: "Logistics & Supply Chain",
    keywords: [
      "logistics",
      "warehouse",
      "supply chain",
      "procurement",
      "inventory",
      "stock controller",
      "dispatch",
      "forklift",
      "picker",
      "packer",
    ],
    providerAliases: ["logistics-warehouse-jobs", "logistics", "supply-chain", "warehouse"],
  },
  {
    key: "driving-transport",
    label: "Driving & Transport",
    keywords: [
      "driver",
      "code 14",
      "code 10",
      "truck driver",
      "delivery driver",
      "courier",
      "transport",
      "chauffeur",
    ],
    providerAliases: ["transport-jobs", "driving", "transport"],
  },
  {
    key: "hospitality-tourism",
    label: "Hospitality & Tourism",
    keywords: [
      "chef",
      "waiter",
      "waitress",
      "barista",
      "hotel",
      "lodge",
      "hospitality",
      "tourism",
      "tour guide",
      "housekeeping",
      "restaurant",
      "catering",
    ],
    providerAliases: ["hospitality-catering-jobs", "hospitality", "tourism", "catering"],
  },
  {
    key: "retail",
    label: "Retail",
    keywords: [
      "retail",
      "cashier",
      "shop assistant",
      "store manager",
      "sales assistant",
      "till",
      "merchandising",
    ],
    providerAliases: ["retail-jobs", "retail"],
  },
  {
    key: "legal",
    label: "Legal",
    keywords: [
      "attorney",
      "lawyer",
      "legal",
      "paralegal",
      "advocate",
      "conveyancer",
      "compliance officer",
      "candidate attorney",
    ],
    providerAliases: ["legal-jobs", "legal"],
  },
  {
    key: "hr-recruitment",
    label: "HR & Recruitment",
    keywords: [
      "human resources",
      "hr ",
      "recruiter",
      "recruitment",
      "talent acquisition",
      "people and culture",
      "industrial relations",
    ],
    providerAliases: ["hr-jobs", "human resources", "hr", "recruitment"],
  },
  {
    key: "customer-service",
    label: "Customer Service",
    keywords: [
      "customer service",
      "call centre",
      "call center",
      "contact centre",
      "customer support",
      "client service",
      "help desk",
    ],
    providerAliases: ["customer-services-jobs", "customer service", "customer-service"],
  },
  {
    key: "security",
    label: "Security",
    keywords: [
      "security guard",
      "security officer",
      "armed response",
      "psira",
      "surveillance",
      "patrol",
    ],
    providerAliases: ["security-jobs", "security"],
  },
  {
    key: "agriculture",
    label: "Agriculture",
    keywords: [
      "farm",
      "agricultur",
      "agronom",
      "horticultur",
      "livestock",
      "irrigation",
      "harvest",
    ],
    providerAliases: ["agriculture-jobs", "agriculture", "farming"],
  },
  {
    key: "government-public-sector",
    label: "Government & Public Sector",
    keywords: [
      "municipal",
      "government",
      "public sector",
      "department of",
      "provincial",
      "dpsa",
      "state",
    ],
    providerAliases: ["government", "public-sector", "dpsa"],
  },
  {
    key: "media-creative",
    label: "Media & Creative",
    keywords: [
      "designer",
      "graphic design",
      "copywriter",
      "journalist",
      "editor",
      "videographer",
      "photographer",
      "ux",
      "ui designer",
      "content creator",
    ],
    providerAliases: ["creative-design-jobs", "design", "writing", "media"],
  },
  {
    key: "other",
    label: "Other",
    keywords: [],
    providerAliases: ["all others", "other", "general", "unknown"],
  },
];

const CATEGORY_BY_KEY: Record<string, JobCategory> = JOB_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.key] = category;
    return acc;
  },
  {} as Record<string, JobCategory>,
);

const JOB_CATEGORY_KEY_SET = new Set<string>(JOB_CATEGORY_KEYS);

export function isJobCategoryKey(value: string | null | undefined): value is JobCategoryKey {
  if (!value) return false;
  return JOB_CATEGORY_KEY_SET.has(value);
}

export function jobCategoryLabel(key: string | null | undefined): string {
  if (!key || !isJobCategoryKey(key)) return "Other";
  const category = CATEGORY_BY_KEY[key];
  return category ? category.label : "Other";
}

function normalize(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-start-anchored pattern for a set of terms: matches "metallurg" inside
 * "metallurgist" (open-ended) but never "oil" inside "boilermaker" (the `\b`
 * requires the term to begin at a word boundary). Empty term lists never match.
 */
function buildTermPattern(terms: string[]): RegExp | null {
  const normalized = terms.map((term) => normalize(term)).filter((term) => term.length > 0);
  if (normalized.length === 0) return null;
  const alternation = normalized.map((term) => escapeRegExp(term)).join("|");
  return new RegExp(`\\b(?:${alternation})`);
}

const CATEGORY_PROVIDER_PATTERNS: Array<{ key: JobCategoryKey; pattern: RegExp }> =
  JOB_CATEGORIES.flatMap((category) => {
    const pattern = buildTermPattern(category.providerAliases);
    return pattern ? [{ key: category.key, pattern }] : [];
  });

const CATEGORY_KEYWORD_PATTERNS: Array<{ key: JobCategoryKey; pattern: RegExp }> =
  JOB_CATEGORIES.flatMap((category) => {
    const pattern = buildTermPattern(category.keywords);
    return pattern ? [{ key: category.key, pattern }] : [];
  });

export interface RuleBasedCategoryInput {
  title?: string | null;
  providerCategory?: string | null;
}

/**
 * Deterministic categorization with no AI: first trusts the source provider's
 * own category (strong signal), then falls back to title keywords. Returns null
 * when nothing matches so callers can decide whether to invoke an AI fallback.
 */
export function matchJobCategoryRuleBased(input: RuleBasedCategoryInput): JobCategoryKey | null {
  const providerCategory = normalize(input.providerCategory);
  if (providerCategory.length > 0) {
    const providerMatch = CATEGORY_PROVIDER_PATTERNS.find(
      (entry) => entry.key !== "other" && entry.pattern.test(providerCategory),
    );
    if (providerMatch) return providerMatch.key;
  }

  const title = normalize(input.title);
  if (title.length > 0) {
    const titleMatch = CATEGORY_KEYWORD_PATTERNS.find((entry) => entry.pattern.test(title));
    if (titleMatch) return titleMatch.key;
  }

  return null;
}

/**
 * Returns every canonical category whose keywords appear in the given free text
 * (e.g. a CV summary + skills), capped at `limit` in taxonomy order. Provider
 * aliases are intentionally excluded here — they are source-tag vocabulary, not
 * CV prose. Used to derive a seeker's target categories without AI.
 */
export function matchAllJobCategoriesRuleBased(
  text: string | null | undefined,
  limit = 3,
): JobCategoryKey[] {
  const haystack = normalize(text);
  if (haystack.length === 0) return [];
  return CATEGORY_KEYWORD_PATTERNS.filter((entry) => entry.pattern.test(haystack))
    .slice(0, limit)
    .map((entry) => entry.key);
}

export const MATCH_TIERS = ["soft", "medium", "hard"] as const;

export type MatchTier = (typeof MATCH_TIERS)[number];

export const DEFAULT_MATCH_TIER: MatchTier = "soft";

export function isMatchTier(value: string | null | undefined): value is MatchTier {
  if (!value) return false;
  return (MATCH_TIERS as readonly string[]).includes(value);
}

/**
 * Neighbourhoods of related categories. A seeker on the Medium tier is matched
 * against their target categories plus the other members of any cluster their
 * targets belong to, so adjacent fields surface without opening the full pool.
 */
export const JOB_CATEGORY_CLUSTERS: JobCategoryKey[][] = [
  [
    "engineering-technical",
    "skilled-trades",
    "manufacturing-production",
    "mining-resources",
    "construction",
    "energy-utilities",
    "science-research",
  ],
  ["it-software", "engineering-technical", "media-creative"],
  [
    "finance-accounting",
    "admin-office",
    "hr-recruitment",
    "legal",
    "customer-service",
    "sales-marketing",
  ],
  ["healthcare-medical", "education-training"],
  [
    "logistics-supply-chain",
    "driving-transport",
    "retail",
    "hospitality-tourism",
    "agriculture",
    "security",
  ],
];

/**
 * Expands target categories with the other members of any cluster they belong
 * to (the targets themselves are always included). Returns distinct keys.
 */
export function expandWithAdjacentCategories(keys: JobCategoryKey[]): JobCategoryKey[] {
  if (keys.length === 0) return [];
  const targetSet = new Set<JobCategoryKey>(keys);
  const adjacent = JOB_CATEGORY_CLUSTERS.filter((cluster) =>
    cluster.some((key) => targetSet.has(key)),
  ).flat();
  return [...new Set<JobCategoryKey>([...keys, ...adjacent])];
}
