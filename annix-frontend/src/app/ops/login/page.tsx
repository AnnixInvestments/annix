"use client";

import { isUndefined } from "es-toolkit/compat";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

const DEFAULT_OPS_RETURN_URL = "/ops/portal/dashboard";

function safeOpsReturnUrl(raw: string | null): string {
  if (!raw) return DEFAULT_OPS_RETURN_URL;
  if (!raw.startsWith("/ops/portal/")) return DEFAULT_OPS_RETURN_URL;
  if (raw.startsWith("//")) return DEFAULT_OPS_RETURN_URL;
  if (raw.startsWith("/\\")) return DEFAULT_OPS_RETURN_URL;
  const hasControlChar = Array.from(raw).some((ch) => {
    const code = ch.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
  if (hasControlChar) return DEFAULT_OPS_RETURN_URL;
  const currentWindow = globalThis.window;
  if (isUndefined(currentWindow)) return DEFAULT_OPS_RETURN_URL;
  try {
    const parsed = new URL(raw, currentWindow.location.origin);
    if (parsed.origin !== currentWindow.location.origin) return DEFAULT_OPS_RETURN_URL;
    if (parsed.pathname.includes("..")) return DEFAULT_OPS_RETURN_URL;
    if (decodeURIComponent(parsed.pathname).includes("..")) return DEFAULT_OPS_RETURN_URL;
    if (!parsed.pathname.startsWith("/ops/portal/")) return DEFAULT_OPS_RETURN_URL;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_OPS_RETURN_URL;
  }
}

function OpsLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get("returnUrl");
  const rawExpired = searchParams.get("expired");
  const returnUrl = safeOpsReturnUrl(rawReturnUrl);
  const sessionExpired = rawExpired === "1";

  useEffect(() => {
    const targetParams = new URLSearchParams({ returnUrl });
    if (sessionExpired) targetParams.set("expired", "1");
    const target = `/core?${targetParams.toString()}`;
    router.replace(target);
  }, [router, returnUrl, sessionExpired]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-grad-from)]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]" />
    </div>
  );
}

export default function OpsLoginPage() {
  return (
    <BrandingProvider brand="annix-core" surface={false}>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[var(--brand-grad-from)]">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]" />
          </div>
        }
      >
        <OpsLoginRedirect />
      </Suspense>
    </BrandingProvider>
  );
}
