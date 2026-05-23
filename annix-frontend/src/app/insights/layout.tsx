import type { Metadata } from "next";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { InsightsAuthProvider } from "./context/InsightsAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Insights",
    default: "Annix Insights",
  },
  description: "Private investment intelligence and paper-trading test harness.",
};

export default function InsightsLayout(props: { children: React.ReactNode }) {
  return (
    <InsightsAuthProvider>
      <BrandingProvider brand="annix-insights">{props.children}</BrandingProvider>
    </InsightsAuthProvider>
  );
}
