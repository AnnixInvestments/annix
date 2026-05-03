import type { Metadata } from "next";
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
  return <TeacherAssistantAuthProvider>{children}</TeacherAssistantAuthProvider>;
}
