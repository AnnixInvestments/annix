// eslint-disable-next-line no-restricted-imports -- server component cannot import the "use client" datetime wrapper; sitemap.ts is rendered at request time on the server
import { DateTime } from "luxon";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveBaseUrl } from "@/lib/api-config";

const AU_INDUSTRIES_HOSTS = new Set(["auind.co.za", "www.auind.co.za"]);
const AUIND_SITE_URL = "https://auind.co.za";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];

  if (!AU_INDUSTRIES_HOSTS.has(host)) {
    return [];
  }

  const currentDate = DateTime.now().toJSDate();
  const entries: MetadataRoute.Sitemap = [
    {
      url: AUIND_SITE_URL,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${AUIND_SITE_URL}/products-and-services`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${AUIND_SITE_URL}/gallery`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${AUIND_SITE_URL}/quote`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${AUIND_SITE_URL}/contact`,
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
          url: `${AUIND_SITE_URL}/${page.slug}`,
          lastModified: DateTime.fromISO(page.updatedAt).toJSDate(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }));

      entries.push(...pageEntries);
    }
  } catch {
    return entries;
  }

  return entries;
}
