import type { Metadata } from "next";
import { MarketingLegalPage } from "@/app/lib/marketing/components/MarketingLegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy | Annix Investments",
  description: "How Annix uses cookies and similar technologies across its websites and services.",
};

export default function CookiePolicyPage() {
  return <MarketingLegalPage doc="cookies" />;
}
