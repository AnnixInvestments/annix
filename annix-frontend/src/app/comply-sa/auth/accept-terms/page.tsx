"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AmixLogo from "@/app/components/AmixLogo";

export default function AcceptTermsPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!accepted) {
      setError("You must accept the updated terms to continue");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/comply-sa/auth/accept-terms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const bodyMsg = body?.message;
        throw new Error(bodyMsg || "Failed to accept terms");
      }

      router.push("/comply-sa/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/comply-sa" className="inline-flex items-center gap-2">
            <AmixLogo size="sm" showText useSignatureFont />
          </Link>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Updated Terms</h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Our Terms of Service and Privacy Policy have been updated. Please review and accept the
            new terms to continue using Annix Comply SA.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex gap-3 text-sm">
              <Link
                href="/comply-sa/privacy"
                target="_blank"
                className="flex-1 text-center py-2 border border-slate-600 rounded-lg text-teal-400 hover:border-teal-500 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/comply-sa/auth/signup"
                target="_blank"
                className="flex-1 text-center py-2 border border-slate-600 rounded-lg text-teal-400 hover:border-teal-500 transition-colors"
              >
                Terms of Service
              </Link>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-0 accent-teal-500"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                I have reviewed and accept the updated{" "}
                <strong className="text-teal-400">Terms of Service and Privacy Policy</strong>
              </span>
            </label>

            <button
              type="button"
              onClick={handleAccept}
              disabled={loading || !accepted}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Saving..." : "Accept & Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
