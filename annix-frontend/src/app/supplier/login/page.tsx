"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PasskeyLoginButton } from "@/app/components/PasskeyLoginButton";
import { useSupplierAuth } from "@/app/context/SupplierAuthContext";
import { useDeviceFingerprint } from "@/app/hooks/useDeviceFingerprint";
import { supplierTokenStore } from "@/app/lib/api/portalTokenStores";
import { redirectAfterPasskeyLogin, storePasskeyJwt } from "@/app/lib/passkey";

function SupplierLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const { login } = useSupplierAuth();
  const { fingerprint, browserInfo, isLoading: isFingerprintLoading } = useDeviceFingerprint();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const localGlobal = globalThis.localStorage;
    if (!localGlobal) return;
    const remembered = localGlobal.getItem("supplierRememberedEmail");
    const flag = localGlobal.getItem("supplierRememberMe") === "true";
    setRememberMe(flag);
    setEmail((current) => {
      if (current.trim() !== "") return current;
      return remembered || "";
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fingerprint) {
      setError("Unable to verify device. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password, fingerprint, browserInfo ?? undefined, rememberMe);

      if (rememberMe) {
        localStorage.setItem("supplierRememberedEmail", email);
        localStorage.setItem("supplierRememberMe", "true");
      } else {
        localStorage.removeItem("supplierRememberedEmail");
        localStorage.removeItem("supplierRememberMe");
      }

      router.push(returnUrl || "/supplier/portal/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Supplier Login</h1>
          <p className="mt-2 text-blue-200">Sign in to access your supplier portal</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            name="login"
            data-form-type="login"
            method="post"
            action="#"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="supplier@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || isFingerprintLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Signing in..."
                : isFingerprintLoading
                  ? "Verifying device..."
                  : "Sign In"}
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
                appCode="supplier"
                onSuccess={(response) => {
                  storePasskeyJwt(supplierTokenStore, response, rememberMe);
                  redirectAfterPasskeyLogin(returnUrl || "/supplier/portal/dashboard");
                }}
                onError={(message) => setError(message)}
              />
            </div>
          </div>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/supplier/register"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Register
              </Link>
            </p>
          </div>

          {fingerprint && (
            <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-gray-500">
              <p className="font-medium">Device Security</p>
              <p className="mt-1">
                Your account is bound to this device for security. If you need to change devices,
                please contact support.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="bg-blue-800 bg-opacity-50 border border-blue-400 rounded-lg p-4 max-w-md mx-auto backdrop-blur-sm">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-200 mr-2 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div className="text-left">
                <h4 className="text-sm font-medium text-white">Secure Supplier Access</h4>
                <p className="mt-1 text-xs text-blue-100">
                  Your account is bound to this device for security. If you need to change devices,
                  please contact support.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-blue-200 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SupplierLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <SupplierLoginContent />
    </Suspense>
  );
}
