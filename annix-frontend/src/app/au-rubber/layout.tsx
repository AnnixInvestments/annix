import type { Metadata } from "next";
import AuRubberLayoutClient from "./AuRubberLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | AU Rubber",
    default: "AU Rubber",
  },
  description: "AU Rubber product management",
};

export default function AuRubberLayout({ children }: { children: React.ReactNode }) {
  return <AuRubberLayoutClient>{children}</AuRubberLayoutClient>;
}
