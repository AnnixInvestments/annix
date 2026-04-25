import type { Metadata } from "next";
import { AuIndustriesLayoutClient } from "./AuIndustriesLayoutClient";

const SITE_URL = "https://auind.co.za";
const SITE_DESCRIPTION =
  "AU Industries specialises in rubber lining, rubber sheeting, HDPE lining, and industrial rubber solutions for mining, chemical processing, and water treatment in South Africa.";

export const metadata: Metadata = {
  title: {
    default: "AU Industries - Rubber Lining, Sheeting & Industrial Solutions",
    template: "%s | AU Industries",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: SITE_URL,
    siteName: "AU Industries",
    title: "AU Industries - Rubber Lining, Sheeting & Industrial Solutions",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/au-industries/logo.jpg`,
        width: 400,
        height: 200,
        alt: "AU Industries Logo",
      },
    ],
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: "sp2KS-iFxp5dRSfkuMv7xDR6FHve0O4hMfyApm269xk",
  },
};

export default function AuIndustriesLayout(props: { children: React.ReactNode }) {
  return <AuIndustriesLayoutClient>{props.children}</AuIndustriesLayoutClient>;
}
