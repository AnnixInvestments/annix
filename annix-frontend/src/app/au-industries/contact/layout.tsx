import type { Metadata } from "next";

const SITE_URL = "https://auind.co.za";
const TITLE = "Contact Us";
const DESCRIPTION =
  "Contact AU Industries in Boksburg for rubber lining, rubber sheeting, HDPE piping and mining solutions. Call 072 039 8429 or send us an enquiry.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/contact`,
    title: `${TITLE} | AU Industries`,
    description: DESCRIPTION,
  },
};

export default function AuIndustriesContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
