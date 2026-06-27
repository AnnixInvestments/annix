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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#FF8A00]" />
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
