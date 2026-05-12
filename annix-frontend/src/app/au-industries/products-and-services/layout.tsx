import type { Metadata } from "next";

const SITE_URL = "https://auind.co.za";
const TITLE = "Products, Projects & Services";
const DESCRIPTION =
  "AU Industries products and services: rubber compound, rubber sheeting, ceramic embedded wear panels, HDPE piping, pipe and tank fabrication, and on-site maintenance for mining.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/products-and-services` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/products-and-services`,
    title: `${TITLE} | AU Industries`,
    description: DESCRIPTION,
  },
};

export default function AuIndustriesProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
