import type { Metadata } from "next";
import { AnnixOrbitAuthProvider } from "@/app/context/AnnixOrbitAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Orbit",
    default: "Annix Orbit",
  },
  description:
    "Annix Orbit — Hiring, Talent, Compliance. The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.",
  icons: {
    // Canonical brand mark — the JPEG crop of the real generated artwork.
    // Browsers downscale cleanly for tab favicons; SVGs are kept as fallbacks
    // for older browsers that prefer vector icons.
    icon: [
      { url: "/branding/annix-orbit-icon.png", type: "image/png", sizes: "any" },
      { url: "/branding/annix-orbit-favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/branding/annix-orbit-icon.png",
  },
};

export default function AnnixOrbitLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <AnnixOrbitAuthProvider>{children}</AnnixOrbitAuthProvider>;
}
