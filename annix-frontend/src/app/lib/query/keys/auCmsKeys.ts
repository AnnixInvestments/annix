export const auCmsKeys = {
  websitePages: {
    all: ["auCms", "websitePages"] as const,
    list: () => [...auCmsKeys.websitePages.all, "list"] as const,
    detail: (id: string) => [...auCmsKeys.websitePages.all, "detail", id] as const,
  },
  testimonials: {
    all: ["auCms", "testimonials"] as const,
    list: () => [...auCmsKeys.testimonials.all, "list"] as const,
    detail: (id: string) => [...auCmsKeys.testimonials.all, "detail", id] as const,
  },
  blogPosts: {
    all: ["auCms", "blogPosts"] as const,
    list: () => [...auCmsKeys.blogPosts.all, "list"] as const,
    detail: (id: string) => [...auCmsKeys.blogPosts.all, "detail", id] as const,
  },
  dataSheets: {
    all: ["auCms", "dataSheets"] as const,
    list: () => [...auCmsKeys.dataSheets.all, "list"] as const,
    detail: (id: string) => [...auCmsKeys.dataSheets.all, "detail", id] as const,
  },
} as const;
