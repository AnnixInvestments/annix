"use client";

import { useEffect, useState } from "react";
import type { PasskeyLoginResponse } from "@/app/lib/passkey";
import { authenticateWithPasskey, isPasskeySupported } from "@/app/lib/passkey";

interface PasskeyLoginButtonProps {
  email?: string | null;
  onSuccess: (response: PasskeyLoginResponse) => void | Promise<void>;
  onError?: (message: string) => void;
  className?: string;
  label?: string;
  conditional?: boolean;
  appCode?: string;
}

export function PasskeyLoginButton(props: PasskeyLoginButtonProps) {
  const {
    email,
    onSuccess,
    onError,
    className,
    label = "Sign in with passkey",
    conditional = false,
    appCode,
  } = props;

  const [supported, setSupported] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setSupported(isPasskeySupported());
  }, []);

  useEffect(() => {
    if (!supported || !conditional) return;

    let cancelled = false;
    const trigger = async () => {
      try {
        const response = await authenticateWithPasskey(email ?? null, {
          conditional: true,
          appCode,
        });
        if (cancelled) return;
        await onSuccess(response);
      } catch {
        // Conditional UI silently fails when no credentials are available
      }
    };

    trigger();
    return () => {
      cancelled = true;
    };
  }, [supported, conditional, email, onSuccess, appCode]);

  if (!supported) return null;

  const handleClick = async () => {
    setIsPending(true);
    try {
      const trimmedEmail = email?.trim();
      const response = await authenticateWithPasskey(trimmedEmail || null, { appCode });
      await onSuccess(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Passkey sign-in failed";
      onError?.(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        className ??
        "w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      }
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM12 11v3m-3 3h6a3 3 0 003-3v-1a3 3 0 00-3-3H9a3 3 0 00-3 3v1a3 3 0 003 3z"
        />
      </svg>
      {isPending ? "Authenticating..." : label}
    </button>
  );
}
