import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pricing - Annix",
  description: "View pricing plans for Annix industrial pipeline quoting platform.",
};

export default function PricingLayout(props: { children: ReactNode }) {
  const { children } = props;
  return children;
}
