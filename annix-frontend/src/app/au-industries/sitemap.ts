import type { MetadataRoute } from "next";
import { fromISO, now } from "@/app/lib/datetime";
import { resolveBaseUrl } from "@/lib/api-config";

const SITE_URL = "https://auind.co.za";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = now().toJSDate();
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products-and-services`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/gallery`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/quote`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  try {
    const base = resolveBaseUrl();
    const res = await fetch(`${base}/public/au-industries/pages`, {
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const pages = await res.json();
      const pageEntries = pages
        .filter((page: { isHomePage: boolean }) => !page.isHomePage)
        .map((page: { slug: string; updatedAt: string }) => ({
          url: `${SITE_URL}/${page.slug}`,
          lastModified: fromISO(page.updatedAt).toJSDate(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }));

      entries.push(...pageEntries);
    }
  } catch {
    // Sitemap generation should not fail if API is unavailable
  }

  return entries;
}
