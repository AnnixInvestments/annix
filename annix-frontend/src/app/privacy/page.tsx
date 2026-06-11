import type { Metadata } from "next";
import { MarketingLegalPage } from "@/app/lib/marketing/components/MarketingLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Annix Investments",
  description:
    "How Annix collects, uses and protects personal information across its websites, applications, products and services.",
};

export default function PrivacyPolicyPage() {
  return <MarketingLegalPage doc="privacy" />;
}
