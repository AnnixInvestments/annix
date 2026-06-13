import type { Metadata } from "next";

const ENV_PUBLIC_URL = process.env.NEXT_PUBLIC_ORBIT_PUBLIC_URL;
const SITE_URL = ENV_PUBLIC_URL || "https://annix-app.fly.dev";
const PAGE_URL = `${SITE_URL}/annix/orbit/seeker/register-interest`;
const OG_IMAGE = `${SITE_URL}/branding/annix-orbit-icon-512.png`;
const TITLE = "Get Early Access to Annix Orbit Seeker";
const DESCRIPTION =
  "Upload your CV, get your AI Career Score, and discover better job opportunities — built for South African professionals. Join the early-access list.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  // Drop the PWA manifest the parent Orbit layout sets, so the browser offers
  // no install affordance on the public early-access page — early-access
  // registrants must not be able to install the app until granted access.
  manifest: null,
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "Annix Orbit",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 512, height: 512, alt: "Annix Orbit" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RegisterInterestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
