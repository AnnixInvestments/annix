import type { Metadata } from "next";

const SITE_URL = "https://auind.co.za";
const TITLE = "Request a Quote";
const DESCRIPTION =
  "Request a quote from AU Industries for rubber lining, compound, sheeting, HDPE piping, mining projects and industrial rubber products.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/quote` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/quote`,
    title: `${TITLE} | AU Industries`,
    description: DESCRIPTION,
  },
};

export default function AuIndustriesQuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
