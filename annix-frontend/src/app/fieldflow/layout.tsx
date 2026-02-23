import type { Metadata } from "next";
import AnnixRepLayoutClient from "./AnnixRepLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Rep",
    default: "Annix Rep",
  },
  description: "Mobile-first sales field assistant with smart prospecting, calendar sync, and meeting recording",
};

export default function AnnixRepLayout({ children }: { children: React.ReactNode }) {
  return <AnnixRepLayoutClient>{children}</AnnixRepLayoutClient>;
}
