import type { Metadata } from "next";

const SITE_URL = "https://auind.co.za";
const TITLE = "Project Gallery";
const DESCRIPTION =
  "Browse AU Industries project gallery showcasing rubber lining, ceramic embedded rubber, HDPE piping and mining solutions across South Africa, Mozambique and Namibia.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/gallery` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/gallery`,
    title: `${TITLE} | AU Industries`,
    description: DESCRIPTION,
  },
};

export default function AuIndustriesGalleryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
