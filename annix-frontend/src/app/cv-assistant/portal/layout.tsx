"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import { useCvAssistantAuth } from "@/app/context/CvAssistantAuthContext";
import { CV_ASSISTANT_VERSION } from "../config/version";
import {
  BriefcaseIcon,
  ChartIcon,
  ClipboardIcon,
  CogIcon,
  DocumentIcon,
  GlobeIcon,
  HomeIcon,
  UsersIcon,
} from "./components/icons";

const navigation = [
  { name: "Dashboard", href: "/cv-assistant/portal/dashboard", icon: HomeIcon },
  { name: "Jobs", href: "/cv-assistant/portal/jobs", icon: BriefcaseIcon },
  { name: "Candidates", href: "/cv-assistant/portal/candidates", icon: UsersIcon },
  { name: "References", href: "/cv-assistant/portal/references", icon: ClipboardIcon },
  { name: "Job Market", href: "/cv-assistant/portal/job-market", icon: GlobeIcon },
  { name: "Analytics", href: "/cv-assistant/portal/analytics", icon: ChartIcon },
  { name: "Settings", href: "/cv-assistant/portal/settings", icon: CogIcon },
];

function PortalContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, logout } = useCvAssistantAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/cv-assistant/login?returnUrl=${returnUrl}`);
    }
  }, [isLoading, isAuthenticated, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/cv-assistant/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/cv-assistant/portal/dashboard" className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-violet-100 rounded-lg mr-3">
                  <DocumentIcon className="w-6 h-6 text-violet-600" />
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
                      <item.icon className="w-5 h-5 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
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

export default function PortalLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto" />
        </div>
      }
    >
      <PortalContent>{children}</PortalContent>
    </Suspense>
  );
}
