import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About Annix - Industrial Pipeline Quoting Platform",
  description:
    "Learn about Annix, the leading industrial pipeline quoting platform for fabrication and piping suppliers.",
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
