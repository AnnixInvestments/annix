import { CvAssistantAuthProvider } from "@/app/context/CvAssistantAuthContext";

export default function CvAssistantLayout({ children }: { children: React.ReactNode }) {
  return <CvAssistantAuthProvider>{children}</CvAssistantAuthProvider>;
}
