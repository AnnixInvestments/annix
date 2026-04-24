import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
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
