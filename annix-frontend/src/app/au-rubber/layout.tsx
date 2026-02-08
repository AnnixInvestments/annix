import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";

export default function AuRubberLayout({ children }: { children: React.ReactNode }) {
  return <AuRubberAuthProvider>{children}</AuRubberAuthProvider>;
}
