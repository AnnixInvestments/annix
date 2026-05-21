import type { Metadata } from "next";
import { CvAssistantAuthProvider } from "@/app/context/CvAssistantAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Orbit",
    default: "Annix Orbit",
  },
  description:
    "Annix Orbit — Hiring, Talent, Compliance. The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.",
};

export default function CvAssistantLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <CvAssistantAuthProvider>{children}</CvAssistantAuthProvider>;
}
