import type { Metadata } from "next";
import { AdminAuthProvider } from "@/app/context/AdminAuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Admin",
    default: "Annix Admin",
  },
  description: "Annix administration portal",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
