"use client";

import type { ReactNode } from "react";
import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";
import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

// The /core login (CoreLoginForm) resolves credentials and then calls the
// matched app's login() via useStockControlAuth()/useAuRubberAuth(), so BOTH
// auth contexts must be mounted here or the page crashes on a cold load. The
// BrandingProvider supplies the annix-core brand vars around the form.
export default function CoreLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <BrandingProvider brand="annix-core" surface={false}>
      <StockControlAuthProvider>
        <AuRubberAuthProvider>{children}</AuRubberAuthProvider>
      </StockControlAuthProvider>
    </BrandingProvider>
  );
}
