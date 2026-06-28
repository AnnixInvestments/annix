"use client";

import type { ReactNode } from "react";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

export default function CoreLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <BrandingProvider brand="annix-core" surface={false}>
      {children}
    </BrandingProvider>
  );
}
