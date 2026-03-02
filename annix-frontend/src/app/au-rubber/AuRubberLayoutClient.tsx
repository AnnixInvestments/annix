"use client";

import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";
import { AuRubberBrandingProvider } from "@/app/context/AuRubberBrandingContext";
import { AuRubberDynamicBranding } from "./components/AuRubberDynamicBranding";

export default function AuRubberLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuRubberBrandingProvider>
      <AuRubberDynamicBranding />
      <AuRubberAuthProvider>{children}</AuRubberAuthProvider>
    </AuRubberBrandingProvider>
  );
}
