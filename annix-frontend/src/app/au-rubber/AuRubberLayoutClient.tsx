"use client";

import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";
import { AuRubberBrandingProvider } from "@/app/context/AuRubberBrandingContext";

export default function AuRubberLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuRubberBrandingProvider>
      <AuRubberAuthProvider>{children}</AuRubberAuthProvider>
    </AuRubberBrandingProvider>
  );
}
