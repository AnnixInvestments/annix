"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { extractErrorMessage, throwIfNotOk } from "@/app/lib/api/apiError";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { API_BASE_URL } from "@/lib/api-config";

const DEFAULT_LOGIN_ROUTE = "/admin/login";
const MIN_PASSWORD_LENGTH = 8;

const APP_LOGIN_ROUTES: Record<string, string> = {
  "annix-orbit": "/annix/orbit/login",
  admin: "/admin/login",
  "stock-control": "/stock-control/login",
  "au-rubber": "/au-rubber/login",
  customer: "/customer/login",
  supplier: "/supplier/login",
  "annix-rep": "/annix-rep/login",
  "annix-sentinel": "/annix-sentinel/auth/login",
  "teacher-assistant": "/teacher-assistant/login",
};

function loginRouteForApps(apps: string[]): string {
  const primary = apps.find((code) => APP_LOGIN_ROUTES[code]);
  return primary ? APP_LOGIN_ROUTES[primary] : DEFAULT_LOGIN_ROUTE;
}

interface InviteDetails {
  email: string;
  firstName: string | null;
  apps: string[];
}

async function fetchInviteDetails(token: string): Promise<InviteDetails> {
  const response = await fetch(`${API_BASE_URL}/auth/invite/${encodeURIComponent(token)}`);
  await throwIfNotOk(response);
  return response.json();
}

async function submitAcceptInvite(token: string, password: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  await throwIfNotOk(response);
  return response.json();
}

function PageShell(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--brand-navbar,#323288)] mb-4 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">{props.title}</h1>
        </div>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-lg sm:px-10">{props.children}</div>
      </div>
    </div>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteApps, setInviteApps] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoadingInvite(false);
      setInviteError("This invite link is missing its token. Please use the link from your email.");
      return;
    }

    let active = true;
    fetchInviteDetails(token)
      .then((details) => {
        if (!active) return;
        const detailApps = details.apps;
        setInviteEmail(details.email);
        setInviteApps(detailApps ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setInviteError(extractErrorMessage(err, "This invite link is invalid or has expired."));
      })
      .finally(() => {
        if (active) setIsLoadingInvite(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const loginRoute = loginRouteForApps(inviteApps);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!token) {
      setSubmitError("This invite link is missing its token. Please use the link from your email.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setSubmitError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAcceptInvite(token, password);
      setSuccess(true);
    } catch (err) {
      setSubmitError(
        extractErrorMessage(err, "We couldn't activate your account. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingInvite) {
    return (
      <PageShell title="Accept Invite">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-navbar,#323288)] mx-auto" />
          <p className="mt-4 text-gray-600">Checking your invite…</p>
        </div>
      </PageShell>
    );
  }

  if (inviteError) {
    return (
      <PageShell title="Invite Unavailable">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-gray-700">{inviteError}</p>
          <Link
            href={loginRoute}
            className="mt-6 w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)] transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </PageShell>
    );
  }

  if (success) {
    return (
      <PageShell title="Account Ready">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
            <svg
              className="w-6 h-6 text-green-600"
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
          </div>
          <p className="text-gray-700">Your account is ready. You can now sign in.</p>
          <Link
            href={loginRoute}
            className="mt-6 w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Set Your Password">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            readOnly
            value={inviteEmail ?? ""}
            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-600 shadow-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--brand-navbar,#323288)] focus:ring-[var(--brand-navbar,#323288)] pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    showPassword
                      ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  }
                />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {passwordTooShort
              ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
              : `Must be at least ${MIN_PASSWORD_LENGTH} characters`}
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--brand-navbar,#323288)] focus:ring-[var(--brand-navbar,#323288)]"
          />
          {passwordsMismatch && <p className="mt-1 text-xs text-red-600">Passwords do not match</p>}
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-navbar,#323288)] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Activating…" : "Activate Account"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={loginRoute}
          className="text-sm text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)]"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </PageShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <BrandingProvider brand="annix-orbit">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
              <p className="mt-4 text-white">Loading…</p>
            </div>
          </div>
        }
      >
        <AcceptInviteContent />
      </Suspense>
    </BrandingProvider>
  );
}
