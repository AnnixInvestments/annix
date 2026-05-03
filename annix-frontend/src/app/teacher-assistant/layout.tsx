import type { Metadata } from "next";
import { AdminAuthProvider } from "@/app/context/AdminAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Teacher Assistant",
    default: "Annix Teacher Assistant",
  },
  description: "Annix Teacher Assistant",
};

export default function TeacherAssistantLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
