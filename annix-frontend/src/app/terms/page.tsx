import type { Metadata } from "next";
import { MarketingLegalPage } from "@/app/lib/marketing/components/MarketingLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use | Annix Investments",
  description: "The terms that govern use of Annix websites, applications, products and services.",
};

export default function TermsOfUsePage() {
  return <MarketingLegalPage doc="terms" />;
}
