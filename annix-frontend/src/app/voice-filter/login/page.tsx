"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useVoiceFilterAuth } from "@/app/context/VoiceFilterAuthContext";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") ?? "/voice-filter";
  const { isAuthenticated, isLoading: authLoading, login, oauthLogin } = useVoiceFilterAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Sign In - Voice Filter";

    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      window.history.replaceState({}, "", "/voice-filter/login");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [authLoading, isAuthenticated, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(email, password);

      if (success) {
        setSuccess("Signed in!");
        router.replace(redirectPath);
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d9bf0]" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d9bf0]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col items-center justify-center px-4">
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#f4212e] text-white px-6 py-3 rounded-lg text-sm font-medium shadow-lg z-50">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#00ba7c] text-white px-6 py-3 rounded-lg text-sm font-medium shadow-lg z-50">
          {success}
        </div>
      )}

      <div className="w-full max-w-[420px]">
        <div className="text-center mb-9">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1d9bf0] to-[#7856ff] rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🎙️
          </div>
          <h1 className="text-[22px] font-bold text-white">Annix Voice Filter</h1>
          <p className="text-sm text-[#71767b] mt-1.5">Sign in to access your voice profiles</p>
        </div>

        <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-7">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-[13px] text-[#71767b] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-3 text-[15px] bg-[#0f1419] border border-[#2f3336] rounded-lg text-white placeholder-[#536471] focus:border-[#1d9bf0] outline-none transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="block text-[13px] text-[#71767b] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={8}
                className="w-full px-3.5 py-3 text-[15px] bg-[#0f1419] border border-[#2f3336] rounded-lg text-white placeholder-[#536471] focus:border-[#1d9bf0] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-[15px] font-semibold bg-[#1d9bf0] text-white rounded-full hover:bg-[#1a8cd8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 text-xs text-[#536471]">
            <div className="flex-1 h-px bg-[#2f3336]" />
            <span>or continue with</span>
            <div className="flex-1 h-px bg-[#2f3336]" />
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              className="w-full py-2.5 text-sm font-medium border border-[#2f3336] rounded-full text-white flex items-center justify-center gap-2 hover:bg-white/10 hover:border-[#536471] transition-all"
              onClick={() => oauthLogin("google")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
                />
                <path
                  fill="#34A853"
                  d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
                />
                <path
                  fill="#4A90E2"
                  d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              className="w-full py-2.5 text-sm font-medium border border-[#2f3336] rounded-full text-white flex items-center justify-center gap-2 hover:bg-white/10 hover:border-[#536471] transition-all"
              onClick={() => oauthLogin("microsoft")}
            >
              <svg width="18" height="18" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#00a4ef" d="M1 12h10v10H1z" />
                <path fill="#7fba00" d="M12 1h10v10H12z" />
                <path fill="#ffb900" d="M12 12h10v10H12z" />
              </svg>
              Continue with Microsoft
            </button>

            <button
              type="button"
              className="w-full py-2.5 text-sm font-medium border border-[#2f3336] rounded-full text-white flex items-center justify-center gap-2 hover:bg-white/10 hover:border-[#536471] transition-all"
              onClick={() => oauthLogin("teams")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#5059C9"
                  d="M19.5 6.5h-3V5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v1.5h-3A1.5 1.5 0 0 0 3 8v9a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 17V8a1.5 1.5 0 0 0-1.5-1.5zM9.5 5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v1.5h-5V5z"
                />
                <circle fill="#7B83EB" cx="16" cy="4" r="2.5" />
                <path fill="#7B83EB" d="M20 9h-4v8h3a1 1 0 0 0 1-1V9z" />
              </svg>
              Continue with Teams
            </button>

            <button
              type="button"
              className="w-full py-2.5 text-sm font-medium border border-[#2f3336] rounded-full text-white flex items-center justify-center gap-2 hover:bg-white/10 hover:border-[#536471] transition-all"
              onClick={() => oauthLogin("zoom")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#2D8CFF">
                <path d="M4.585 6.836A2.25 2.25 0 0 1 6.75 6h7.5a2.25 2.25 0 0 1 2.25 2.25v1.5l3.128-1.876A1.125 1.125 0 0 1 21.375 9v6a1.125 1.125 0 0 1-1.747.936L16.5 14.06v1.69a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-7.5c0-.597.237-1.169.585-1.585z" />
              </svg>
              Continue with Zoom
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-[#1d9bf0] hover:underline">
            Back to Annix
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VoiceFilterLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d9bf0]" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
