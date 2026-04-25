import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const AU_INDUSTRIES_HOSTS = new Set(["auind.co.za", "www.auind.co.za"]);

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase().split(":")[0];

  if (AU_INDUSTRIES_HOSTS.has(host)) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/au-rubber/", "/admin/", "/api/"],
        },
      ],
      sitemap: "https://auind.co.za/sitemap.xml",
    };
  }

  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
