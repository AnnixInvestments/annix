import type { Metadata } from "next";
import { NixAppProvider, NixAssistant } from "@/app/lib/nix";
import { TeacherAssistantAuthProvider } from "./context/TeacherAssistantAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Teacher Assistant",
    default: "Annix Teacher Assistant",
  },
  description: "Annix Teacher Assistant",
};

export default function TeacherAssistantLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <TeacherAssistantAuthProvider>
      <NixAppProvider appCode="teacher-assistant">
        {children}
        <NixAssistant
          context="general"
          pageContext={{
            currentPage: "Teacher Assistant",
            portalContext: "general",
          }}
        />
      </NixAppProvider>
    </TeacherAssistantAuthProvider>
  );
}
