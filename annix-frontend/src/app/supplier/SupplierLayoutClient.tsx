"use client";

import { SupplierAuthProvider } from "@/app/context/SupplierAuthContext";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

export default function SupplierLayoutClient(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <SupplierAuthProvider>
      <BrandingProvider brand="annix-forge">{children}</BrandingProvider>
    </SupplierAuthProvider>
  );
}
