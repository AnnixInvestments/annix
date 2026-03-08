import type { Metadata } from "next";
import { CvAssistantAuthProvider } from "@/app/context/CvAssistantAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | CV Assistant",
    default: "CV Assistant",
  },
  description: "AI-powered CV screening and candidate management",
};

export default function CvAssistantLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <CvAssistantAuthProvider>{children}</CvAssistantAuthProvider>;
}
