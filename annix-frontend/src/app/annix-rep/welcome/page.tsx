"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAnnixRepAuth } from "@/app/context/AnnixRepAuthContext";
import { useRepProfileStatus } from "@/app/lib/query/hooks";

export default function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAnnixRepAuth();
  const { data: profileStatus, isLoading: profileLoading } = useRepProfileStatus();

  useEffect(() => {
    if (authLoading || (isAuthenticated && profileLoading)) {
      return;
    }

    if (isAuthenticated) {
      if (profileStatus?.setupCompleted) {
        router.replace("/annix-rep");
      } else {
        router.replace("/annix-rep/setup");
      }
    }
  }, [isAuthenticated, authLoading, profileLoading, profileStatus, router]);

  if (authLoading || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-10 bg-gradient-to-br from-indigo-600 to-indigo-700 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Annix Rep</h1>
            <p className="text-indigo-100">Your AI-powered sales assistant</p>
          </div>

          <div className="p-8">
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Find Prospects
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    AI discovers leads matching your industry and products
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Schedule Meetings
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Plan your route and manage appointments
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Track Progress
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Monitor your activity and hit your targets
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/annix-rep/login"
                className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Sign In
              </Link>

              <Link
                href="/annix-rep/setup"
                className="w-full flex items-center justify-center py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Get Started
              </Link>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
              New to Annix Rep? Create an account to get started with AI-powered prospect discovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
