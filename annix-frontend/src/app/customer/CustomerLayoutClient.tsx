"use client";

import { CustomerAuthProvider } from "@/app/context/CustomerAuthContext";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

export default function CustomerLayoutClient(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <CustomerAuthProvider>
      <BrandingProvider brand="annix-forge">{children}</BrandingProvider>
    </CustomerAuthProvider>
  );
}
