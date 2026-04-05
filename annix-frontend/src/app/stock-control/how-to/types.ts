export type HowToRole = "viewer" | "quality" | "storeman" | "accounts" | "manager" | "admin";

export const ALL_ROLES: HowToRole[] = [
  "viewer",
  "quality",
  "storeman",
  "accounts",
  "manager",
  "admin",
];

export interface HowToGuideFrontmatter {
  title: string;
  slug: string;
  category: string;
  roles: HowToRole[];
  order: number;
  tags: string[];
  lastUpdated: string;
  summary: string;
  readingMinutes: number;
  relatedPaths: string[];
}

export interface HowToGuide extends HowToGuideFrontmatter {
  body: string;
}

export interface HowToHeading {
  level: 2 | 3;
  text: string;
  anchor: string;
}

export interface HowToCategoryGroup {
  category: string;
  guides: HowToGuide[];
}

export const isAdminOnly = (guide: Pick<HowToGuide, "roles">): boolean =>
  guide.roles.length === 1 && guide.roles[0] === "admin";

export const guideVisibleToRole = (
  guide: Pick<HowToGuide, "roles">,
  role: string | null,
): boolean => {
  if (!role) return false;
  return guide.roles.includes(role as HowToRole);
};

export const slugifyHeading = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
