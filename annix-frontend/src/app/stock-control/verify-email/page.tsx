"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

type BrandingSelection = "annix" | "custom" | null;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "branding" | "complete" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("");

  const [brandingSelection, setBrandingSelection] = useState<BrandingSelection>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandingAuthorized, setBrandingAuthorized] = useState(false);
  const [brandingError, setBrandingError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    stockControlApiClient
      .verifyEmail(token)
      .then((response) => {
        if (response.needsBranding) {
          setStatus("branding");
        } else {
          setStatus("complete");
        }
        setMessage(response.message);
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Verification failed. Please try again.");
      });
  }, [token]);

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleContinue = async () => {
    if (!brandingSelection) {
      return;
    }

    if (brandingSelection === "custom") {
      if (!websiteUrl.trim()) {
        setBrandingError("Please enter your website URL.");
        return;
      }
      if (!isValidUrl(websiteUrl)) {
        setBrandingError("Please enter a valid website URL.");
        return;
      }
      if (!brandingAuthorized) {
        setBrandingError("Please authorize ASCA to access your website for branding.");
        return;
      }
    }

    setBrandingError("");
    setSaving(true);

    try {
      const normalizedUrl =
        brandingSelection === "custom"
          ? websiteUrl.startsWith("http")
            ? websiteUrl.trim()
            : `https://${websiteUrl.trim()}`
          : undefined;

      let processedLogoUrl: string | undefined;
      let processedPrimaryColor: string | undefined;
      let processedAccentColor: string | undefined;
      let processedHeroUrl: string | undefined;

      if (brandingSelection === "custom" && normalizedUrl && brandingAuthorized) {
        try {
          const candidates = await stockControlApiClient.scrapeBranding(normalizedUrl);
          const firstLogo = candidates.logoCandidates[0]?.url ?? undefined;
          const firstHero = candidates.heroCandidates[0]?.url ?? undefined;

          if (firstLogo || firstHero) {
            const processed = await stockControlApiClient.processBrandingSelection({
              logoSourceUrl: firstLogo,
              heroSourceUrl: firstHero,
              scrapedPrimaryColor: candidates.primaryColor ?? undefined,
            });
            processedLogoUrl = processed.logoUrl ?? undefined;
            processedHeroUrl = processed.heroImageUrl ?? undefined;
            processedPrimaryColor = processed.primaryColor ?? undefined;
            processedAccentColor = processed.accentColor ?? undefined;
          }
        } catch {
          // Scraping is best-effort; continue saving without scraped data
        }
      }

      await stockControlApiClient.setBranding({
        brandingType: brandingSelection,
        websiteUrl: normalizedUrl,
        brandingAuthorized: brandingSelection === "custom" ? brandingAuthorized : undefined,
        primaryColor: processedPrimaryColor,
        accentColor: processedAccentColor,
        logoUrl: processedLogoUrl,
        heroImageUrl: processedHeroUrl,
      });

      setStatus("complete");
    } catch (e) {
      setBrandingError(e instanceof Error ? e.message : "Failed to save branding preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-500 mb-4">
            {status === "verifying" && (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            )}
            {(status === "branding" || status === "complete") && (
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {status === "error" && (
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {status === "verifying" && "Verifying your email..."}
            {status === "branding" && "Email verified"}
            {status === "complete" && "You're all set"}
            {status === "error" && "Verification failed"}
          </h1>
          {status === "branding" && (
            <p className="mt-2 text-teal-200">Choose how you'd like your portal to look</p>
          )}
        </div>
      </div>

      <div
        className={`mt-8 sm:mx-auto sm:w-full ${status === "branding" ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        {status === "verifying" && (
          <div className="bg-white py-8 px-4 shadow-2xl rounded-lg sm:px-10">
            <div className="text-center">
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </div>
          </div>
        )}

        {status === "branding" && (
          <div className="bg-white py-8 px-4 shadow-2xl rounded-lg sm:px-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setBrandingSelection("annix");
                  setBrandingError("");
                }}
                className={`relative flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
                  brandingSelection === "annix"
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500"
                    : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                }`}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 mb-3">
                  <svg
                    className="w-7 h-7 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Annix Branding</h3>
                <p className="mt-1 text-sm text-gray-500 text-center">
                  Use the default ASCA corporate identity
                </p>
                {brandingSelection === "annix" && (
                  <div className="absolute top-3 right-3">
                    <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setBrandingSelection("custom");
                  setBrandingError("");
                }}
                className={`relative flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
                  brandingSelection === "custom"
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500"
                    : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                }`}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-3">
                  <svg
                    className="w-7 h-7 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Your Branding</h3>
                <p className="mt-1 text-sm text-gray-500 text-center">
                  White-label with your corporate identity
                </p>
                {brandingSelection === "custom" && (
                  <div className="absolute top-3 right-3">
                    <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>

            {brandingSelection === "custom" && (
              <div className="mt-6 space-y-4 border-t pt-6">
                <div>
                  <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                    Your website URL
                  </label>
                  <input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => {
                      setWebsiteUrl(e.target.value);
                      setBrandingError("");
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandingAuthorized}
                    onChange={(e) => {
                      setBrandingAuthorized(e.target.checked);
                      setBrandingError("");
                    }}
                    className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">
                    I authorize ASCA to access my website to extract branding elements (logo,
                    colors) for use within this application
                  </span>
                </label>
              </div>
            )}

            {brandingError && <p className="mt-4 text-sm text-red-600">{brandingError}</p>}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!brandingSelection || saving}
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && brandingSelection === "custom" && brandingAuthorized
                ? "Analyzing your brand..."
                : saving
                  ? "Saving..."
                  : "Continue"}
            </button>
          </div>
        )}

        {status === "complete" && (
          <div className="bg-white py-8 px-4 shadow-2xl rounded-lg sm:px-10">
            <div className="text-center">
              <p className="text-gray-700">
                {message || "Your email has been verified. You can now sign in."}
              </p>
              <Link
                href="/stock-control/login"
                className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white py-8 px-4 shadow-2xl rounded-lg sm:px-10">
            <div className="text-center">
              <p className="text-red-600">{message}</p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/stock-control/register"
                  className="w-full flex justify-center py-2 px-4 border border-teal-600 rounded-md shadow-sm text-sm font-medium text-teal-600 bg-white hover:bg-teal-50 transition-colors"
                >
                  Register again
                </Link>
                <Link
                  href="/stock-control/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                >
                  Go to sign in
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-teal-200 hover:text-white">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StockControlVerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-300 mx-auto"></div>
            <p className="mt-4 text-white">Loading...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
