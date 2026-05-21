import type { Metadata } from "next";
import { AnnixOrbitAuthProvider } from "@/app/context/AnnixOrbitAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Orbit",
    default: "Annix Orbit",
  },
  description:
    "Annix Orbit — Hiring, Talent, Compliance. The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.",
};

export default function AnnixOrbitLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <AnnixOrbitAuthProvider>{children}</AnnixOrbitAuthProvider>;
}
