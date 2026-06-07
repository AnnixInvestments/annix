"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { BackToHubLink } from "@/app/annix/orbit/components/BackToHubLink";
import { PasskeyLoginButton } from "@/app/components/PasskeyLoginButton";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitTokenStore } from "@/app/lib/api/portalTokenStores";
import { redirectAfterPasskeyLogin, storePasskeyJwt } from "@/app/lib/passkey";

function postLoginPath(userType: string | undefined, returnUrl: string | null): string {
  if (returnUrl) return returnUrl;
  if (userType === "student") return "/annix/orbit/student/dashboard";
  if (userType === "individual") return "/annix/orbit/seeker/dashboard";
  if (userType === "recruiter") return "/annix/orbit/recruiter/dashboard";
  return "/annix/orbit/portal/dashboard";
}

const ORBIT_LOGIN_TYPES = new Set(["individual", "company", "recruiter", "student"]);

function orbitUserTypeLabel(userType: string): string {
  if (userType === "individual") return "job seeker";
  if (userType === "company") return "company";
  if (userType === "recruiter") return "recruitment agency";
  if (userType === "student") return "student";
  return "account";
}

// When a specific sign-in type is selected (?type=…), reject accounts that
// don't match it — otherwise a company account could sign in on the job-seeker
// page and get silently routed to the company portal.
function loginTypeMismatch(selectedType: string | null, actualType: string): string | null {
  if (!selectedType || !ORBIT_LOGIN_TYPES.has(selectedType)) return null;
  if (selectedType === actualType) return null;
  const actualLabel = orbitUserTypeLabel(actualType);
  const selectedLabel = orbitUserTypeLabel(selectedType);
  return `This account is registered as a ${actualLabel} account, not a ${selectedLabel} account. Please use the ${actualLabel} sign-in.`;
}

function AnnixOrbitLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const accountType = searchParams.get("type");
  const prefilledEmail = searchParams.get("email") ?? "";
  const { login, logout, isLoading } = useAnnixOrbitAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(prefilledEmail);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [phoneType, setPhoneType] = useState<"apple" | "android" | null>(null);
  const isJobSeeker = accountType === "individual";

  useEffect(() => {
    if (prefilledEmail) {
      passwordRef.current?.focus();
    }
  }, [prefilledEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;
    const submitEmail = emailInput ? emailInput.value : email;
    const submitPassword = passwordInput ? passwordInput.value : "";
    setError(null);
    setNeedsSignup(false);

    try {
      const profile = await login(submitEmail, submitPassword, rememberMe, accountType);
      const mismatch = loginTypeMismatch(accountType, profile.userType);
      if (mismatch) {
        await logout().catch(() => {});
        setError(mismatch);
        return;
      }
      if (isJobSeeker && phoneType) {
        annixOrbitApiClient.updateSeekerPreferences({ phoneType }).catch(() => {});
      }
      router.push(postLoginPath(profile.userType, returnUrl));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (/no annix orbit account|please sign up/i.test(message)) {
        setNeedsSignup(true);
      } else {
        setError(message);
      }
    }
  };

  const signupLabel =
    accountType === "individual"
      ? "Sign up as a job seeker"
      : accountType === "company"
        ? "Sign up as a company"
        : accountType === "recruiter"
          ? "Sign up as a recruitment agency"
          : accountType === "student"
            ? "Sign up as a student"
            : "Create an account";

  const registerHref =
    accountType === "individual"
      ? "/annix/orbit/register/individual"
      : accountType === "company"
        ? "/annix/orbit/register/company"
        : accountType === "recruiter"
          ? "/annix/orbit/register/recruiter"
          : accountType === "student"
            ? "/annix/orbit/register/student"
            : "/annix/orbit";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <BackToHubLink />
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <p className="text-gray-600">
              {accountType === "individual"
                ? "Sign in to your job seeker account"
                : accountType === "company"
                  ? "Sign in to your company account"
                  : accountType === "recruiter"
                    ? "Sign in to your recruitment agency account"
                    : accountType === "student"
                      ? "Sign in to your student account"
                      : "Sign in"}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            name="login"
            data-form-type="login"
            method="post"
            action="#"
          >
            {needsSignup ? (
              <div className="bg-[var(--brand-navbar-50,#f0f0fc)] border border-[var(--brand-navbar-200,#c0c0eb)] rounded-lg px-4 py-4">
                <p className="text-sm font-semibold text-gray-900">
                  You don't have an account with us yet
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  No problem — signing up only takes a minute and we'll get you set up.
                </p>
                <Link
                  href={registerHref}
                  className="mt-3 inline-flex w-full items-center justify-center bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--brand-accent-light,#FF9C33)] transition-colors"
                >
                  {signupLabel}
                </Link>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="username email"
                required
                defaultValue=""
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  defaultValue=""
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc] focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#323288] focus:ring-[#f0f0fc]0 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/annix/orbit/forgot-password"
                className="text-sm text-[#323288] hover:text-[#252560]"
              >
                Forgot password?
              </Link>
            </div>

            {isJobSeeker && (
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  What phone do you use?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneType("apple")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      phoneType === "apple"
                        ? "border-[#323288] bg-[#f0f0fc] text-[#323288]"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    iPhone (Apple)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneType("android")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      phoneType === "android"
                        ? "border-[#323288] bg-[#f0f0fc] text-[#323288]"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Android
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Helps us show you the right "add to home screen" guide.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#323288] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#252560] focus:outline-none focus:ring-2 focus:ring-[#f0f0fc]0 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            <div className="mt-4">
              <PasskeyLoginButton
                email={email}
                appCode="annix-orbit"
                onSuccess={async (response) => {
                  storePasskeyJwt(annixOrbitTokenStore, response, rememberMe);
                  const profile = await annixOrbitApiClient.currentUser();
                  const mismatch = loginTypeMismatch(accountType, profile.userType);
                  if (mismatch) {
                    await logout().catch(() => {});
                    setError(mismatch);
                    return;
                  }
                  redirectAfterPasskeyLogin(postLoginPath(profile.userType, returnUrl));
                }}
                onError={(message) => setError(message)}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Do not have an account?{" "}
              <Link href={registerHref} className="text-[#323288] hover:text-[#252560] font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 space-x-4">
          <Link href="/annix/orbit" className="text-[#c0c0eb] hover:text-white text-sm">
            Choose a different account type
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AnnixOrbitLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7373c2]" />
        </div>
      }
    >
      <AnnixOrbitLoginContent />
    </Suspense>
  );
}
