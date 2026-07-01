"use client";

import { isArray } from "es-toolkit/compat";
import { useParams, useRouter } from "next/navigation";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { SourcingReview } from "@/app/lib/nix/components/draft";

const RFQ_BRAND = "annix-forge";

export default function RfqSourcingPage() {
  const router = useRouter();
  const params = useParams();
  const rawParam = params.sessionId;
  const sessionParam = isArray(rawParam) ? rawParam[0] : rawParam;
  const sessionId = Number.parseInt(sessionParam ?? "", 10);

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return (
      <BrandingProvider brand={RFQ_BRAND} surface={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-orange-50/40 flex items-center justify-center px-4">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
            <h2 className="text-xl font-bold" style={{ color: "var(--brand-navbar)" }}>
              Session not found
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This supplier-sourcing link is missing a valid extraction session.
            </p>
            <button
              type="button"
              onClick={() => router.push("/rfq/list")}
              className="mt-6 rounded-lg px-6 py-2 font-semibold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              Back to RFQs
            </button>
          </div>
        </div>
      </BrandingProvider>
    );
  }

  return (
    <BrandingProvider brand={RFQ_BRAND} surface={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-orange-50/40 py-8">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <h1 className="text-3xl font-bold" style={{ color: "var(--brand-navbar)" }}>
              Supplier sourcing
            </h1>
            <p className="mt-1 text-gray-600">
              Review how Nix split this RFQ across your preferred suppliers before sending each
              request.
            </p>
          </div>

          <SourcingReview sessionId={sessionId} />
        </div>
      </div>
    </BrandingProvider>
  );
}
