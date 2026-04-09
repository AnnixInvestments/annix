import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/au-industries/",
        disallow: ["/au-rubber/", "/admin/", "/api/"],
      },
    ],
    sitemap: "https://auind.co.za/au-industries/sitemap.xml",
  };
}
