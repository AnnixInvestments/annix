"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useCvAssistantAuth } from "@/app/context/CvAssistantAuthContext";
import { CV_ASSISTANT_VERSION } from "../config/version";

const navItems: NavItem[] = [
  {
    href: "/cv-assistant/portal/dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/cv-assistant/portal/jobs",
    label: "Jobs",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    href: "/cv-assistant/portal/candidates",
    label: "Candidates",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    href: "/cv-assistant/portal/references",
    label: "References",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  },
  {
    href: "/cv-assistant/portal/job-market",
    label: "Job Market",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  },
  {
    href: "/cv-assistant/portal/analytics",
    label: "Analytics",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    href: "/cv-assistant/portal/settings",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
];

function PortalContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, logout } = useCvAssistantAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/cv-assistant/login?returnUrl=${returnUrl}`);
      return;
    }
    if (user && user.userType === "individual") {
      router.push("/cv-assistant/seeker/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#323288] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288]"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.userType === "individual")) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/cv-assistant/login");
  };

  const userName = user?.name;
  const nameParts = (userName || "").split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

  return (
    <div className="min-h-screen bg-[#323288]">
      <PortalToolbar
        portalType="cvAssistant"
        navItems={navItems}
        user={
          user
            ? {
                firstName,
                lastName,
                email: user.email,
                roles: [user.role],
              }
            : null
        }
        onLogout={handleLogout}
        version={CV_ASSISTANT_VERSION}
      />

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
        <div className="min-h-screen bg-[#323288] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288] mx-auto" />
        </div>
      }
    >
      <PortalContent>{children}</PortalContent>
    </Suspense>
  );
}
