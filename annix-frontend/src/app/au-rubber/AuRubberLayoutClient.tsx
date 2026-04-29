"use client";

import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";
import { AuRubberBrandingProvider } from "@/app/context/AuRubberBrandingContext";
import { AuRubberDynamicBranding } from "./components/AuRubberDynamicBranding";
import { AuRubberNotificationProvider } from "./components/AuRubberNotificationProvider";

export default function AuRubberLayoutClient(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <AuRubberBrandingProvider>
      <AuRubberDynamicBranding />
      <AuRubberNotificationProvider>
        <AuRubberAuthProvider>{children}</AuRubberAuthProvider>
      </AuRubberNotificationProvider>
    </AuRubberBrandingProvider>
  );
}
