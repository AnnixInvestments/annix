import type { Metadata } from "next";
import { Suspense } from "react";
import { CoreLoginForm } from "./CoreLoginForm";

export const metadata: Metadata = {
  title: "Annix Core",
  description:
    "The operations platform for stock, production, documents, quality, and delivery. Source, produce, track, and deliver.",
};

function CoreLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-grad-from)]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]" />
    </div>
  );
}

export default function AnnixCorePage() {
  return (
    <Suspense fallback={<CoreLoginFallback />}>
      <CoreLoginForm />
    </Suspense>
  );
}
