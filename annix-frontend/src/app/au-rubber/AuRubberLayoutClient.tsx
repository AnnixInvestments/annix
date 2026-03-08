"use client";

import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";
import { AuRubberBrandingProvider } from "@/app/context/AuRubberBrandingContext";
import { AuRubberDynamicBranding } from "./components/AuRubberDynamicBranding";

export default function AuRubberLayoutClient(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <AuRubberBrandingProvider>
      <AuRubberDynamicBranding />
      <AuRubberAuthProvider>{children}</AuRubberAuthProvider>
    </AuRubberBrandingProvider>
  );
}
