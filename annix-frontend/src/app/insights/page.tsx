"use client";

import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useState } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { ApiError } from "@/app/lib/api/apiError";
import { INSIGHTS_VERSION } from "./config/version";
import { useInsightsAuth } from "./context/InsightsAuthContext";

const NAV_ITEMS: NavItem[] = [];

export default function InsightsHomePage() {
  const { user, isLoading, isAuthenticated } = useInsightsAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <InsightsLoginCard />;
  }

  return <InsightsDashboard userEmail={user.email} />;
}

function InsightsLoginCard() {
  const { login } = useInsightsAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, rememberMe: true });
    } catch (err) {
      const apiMessage = err instanceof ApiError ? err.message : null;
      const fallback = err instanceof Error ? err.message : "Sign in failed.";
      const message = apiMessage ?? fallback;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D4AF37] mb-4">
            <TrendingUp className="w-7 h-7 text-gray-900" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Annix Insights</h1>
          <p className="text-sm text-gray-400 mt-2">
            Private investment intelligence — sign in to continue.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#D4AF37] hover:bg-[#b8902c] disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-900 font-semibold py-2.5 rounded-lg transition-colors"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Annix Insights v{INSIGHTS_VERSION} · Private — no public registration.
        </p>
      </div>
    </div>
  );
}

function InsightsDashboard(props: { userEmail: string }) {
  const { logout } = useInsightsAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827] text-white">
      <PortalToolbar
        portalType="insights"
        navItems={NAV_ITEMS}
        user={{ email: props.userEmail }}
        onLogout={logout}
        version={INSIGHTS_VERSION}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold tracking-tight">Welcome.</h2>
          <p className="text-gray-400 mt-2 max-w-2xl">
            This is the Phase 0 scaffolding of Annix Insights — the private investment-intelligence
            test harness. There is no data here yet. Phase 1 will add the asset watchlist; Phase 2
            adds historic price ingestion; the six paper portfolios start running at Phase 3.
            Progress is tracked in GitHub issue #287.
          </p>
        </div>
      </main>
    </div>
  );
}
