"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useBrandingContext } from "@/app/lib/branding/BrandingProvider";
import { brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";

export default function AnnixOrbitRegisterRedirect() {
  const router = useRouter();
  const ctx = useBrandingContext();
  const branding = ctx || brandingFallback("annix-orbit");
  const logoIcon = resolveBrandAssetUrl("logoIcon", branding);

  useEffect(() => {
    router.replace("/annix/orbit");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-4">
      <div
        className="w-16 h-16 rounded-2xl bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${logoIcon}')` }}
      />
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-[var(--brand-navbar-200,#c0c0eb)]">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--brand-accent,#FF8A00)]" />
        <span>Taking you to Annix Orbit…</span>
      </div>
    </div>
  );
}
