export interface HowToGuideFrontmatter<TRole extends string = string> {
  title: string;
  slug: string;
  category: string;
  roles: TRole[];
  order: number;
  tags: string[];
  lastUpdated: string;
  summary: string;
  readingMinutes: number;
  relatedPaths: string[];
}

export interface HowToGuide<TRole extends string = string> extends HowToGuideFrontmatter<TRole> {
  body: string;
}

export interface HowToHeading {
  level: 2 | 3;
  text: string;
  anchor: string;
}

export interface HowToLink {
  slug: string;
  title: string;
}

export const isAdminOnly = <TRole extends string>(
  guide: Pick<HowToGuide<TRole>, "roles">,
  adminRole: TRole,
): boolean => guide.roles.length === 1 && guide.roles[0] === adminRole;

export const guideVisibleToRole = <TRole extends string>(
  guide: Pick<HowToGuide<TRole>, "roles">,
  role: string | null,
  allRoles: readonly TRole[],
): boolean => {
  if (!role) return false;
  if (!allRoles.includes(role as TRole)) return false;
  return guide.roles.includes(role as TRole);
};
