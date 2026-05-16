export const auIndustriesKeys = {
  all: ["au-industries"] as const,
  home: () => [...auIndustriesKeys.all, "home"] as const,
  navPages: () => [...auIndustriesKeys.all, "nav-pages"] as const,
  page: (slug: string) => [...auIndustriesKeys.all, "page", slug] as const,
} as const;
