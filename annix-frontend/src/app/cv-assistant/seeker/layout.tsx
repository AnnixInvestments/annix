"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import { useCvAssistantAuth } from "@/app/context/CvAssistantAuthContext";
import { useCvMyProfileStatus } from "@/app/lib/query/hooks";
import { CV_ASSISTANT_VERSION } from "../config/version";

const navigation = [
  { name: "Dashboard", href: "/cv-assistant/seeker/dashboard" },
  { name: "My CV", href: "/cv-assistant/seeker/profile" },
  { name: "Browse Jobs", href: "/cv-assistant/seeker/jobs" },
  { name: "Applications", href: "/cv-assistant/seeker/applications" },
];

function SeekerContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, logout } = useCvAssistantAuth();
  const isIndividual = user?.userType === "individual";
  const profileStatusQuery = useCvMyProfileStatus(isAuthenticated && isIndividual);
  const profileStatus = profileStatusQuery.data;
  const hasCv = profileStatus ? profileStatus.hasCv : null;
  const isOnProfilePage = pathname.startsWith("/cv-assistant/seeker/profile");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/cv-assistant/login?type=individual&returnUrl=${returnUrl}`);
      return;
    }
    if (user && user.userType !== "individual") {
      router.push("/cv-assistant/portal/dashboard");
      return;
    }
    if (isIndividual && hasCv === false && !isOnProfilePage) {
      router.push("/cv-assistant/seeker/profile");
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    isIndividual,
    hasCv,
    isOnProfilePage,
    router,
    pathname,
    searchParams,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!isAuthenticated || (user && user.userType !== "individual")) {
    return null;
  }

  if (isIndividual && hasCv === false && !isOnProfilePage) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/cv-assistant/login?type=individual");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/cv-assistant/seeker/dashboard" className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-violet-100 rounded-lg mr-3">
                  <svg
                    className="w-6 h-6 text-violet-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span className="font-bold text-lg text-gray-900">CV Assistant</span>
                <span className="ml-1.5 text-gray-400 text-xs font-mono hidden sm:inline">
                  v{CV_ASSISTANT_VERSION}
                </span>
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? "bg-violet-100 text-violet-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <FeedbackWidget authContext="cv-assistant" />
    </div>
  );
}

export default function SeekerLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto" />
        </div>
      }
    >
      <SeekerContent>{children}</SeekerContent>
    </Suspense>
  );
}
