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
    icon: [
      { url: "/branding/annix-orbit-favicon.svg", type: "image/svg+xml" },
      { url: "/branding/annix-orbit-icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: "/branding/annix-orbit-icon.svg",
  },
};

export default function AnnixOrbitLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <AnnixOrbitAuthProvider>{children}</AnnixOrbitAuthProvider>;
}
