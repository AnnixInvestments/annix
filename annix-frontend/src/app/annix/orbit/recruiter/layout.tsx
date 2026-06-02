"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import { NixAppProvider, NixAssistant } from "@/app/lib/nix";
import { ANNIX_ORBIT_VERSION } from "../config/version";

const recruiterNavItems: NavItem[] = [
  {
    href: "/annix/orbit/recruiter/dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/annix/orbit/recruiter/jobs",
    label: "Jobs",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    href: "/annix/orbit/recruiter/candidates",
    label: "Candidates",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    href: "/annix/orbit/recruiter/talent-pools",
    label: "Talent Pools",
    icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.5-1.34M7 11a3 3 0 10-2.5-1.34",
  },
  {
    href: "/annix/orbit/recruiter/matches",
    label: "Matches",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    href: "/annix/orbit/recruiter/shortlists",
    label: "Shortlists",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  {
    href: "/annix/orbit/recruiter/clients",
    label: "Clients",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    href: "/annix/orbit/recruiter/submissions",
    label: "Submissions",
    icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  },
  {
    href: "/annix/orbit/recruiter/interviews",
    label: "Interviews",
    icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
  {
    href: "/annix/orbit/recruiter/placements",
    label: "Placements",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    href: "/annix/orbit/recruiter/compliance",
    label: "Compliance",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    href: "/annix/orbit/recruiter/messages",
    label: "Messages",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    href: "/annix/orbit/recruiter/reports",
    label: "Reports",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    href: "/annix/orbit/recruiter/settings",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
];

function homePathForUserType(userType: string): string {
  if (userType === "individual") return "/annix/orbit/seeker/dashboard";
  if (userType === "student") return "/annix/orbit/student/dashboard";
  if (userType === "company") return "/annix/orbit/portal/dashboard";
  return "/annix/orbit/recruiter/dashboard";
}

function RecruiterPortalContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, logout } = useAnnixOrbitAuth();
  const userType = user ? user.userType : null;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/annix/orbit/login?returnUrl=${returnUrl}`);
      return;
    }
    if (userType && userType !== "recruiter") {
      router.replace(homePathForUserType(userType));
    }
  }, [isLoading, isAuthenticated, userType, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288]"></div>
      </div>
    );
  }

  if (!isAuthenticated || (userType && userType !== "recruiter")) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/annix/orbit/login?type=recruiter");
  };

  const userName = user ? user.name : "";
  const nameParts = (userName || "").split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

  return (
    <div className="min-h-screen">
      <PortalToolbar
        portalType="annixOrbit"
        navItems={recruiterNavItems}
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
        version={ANNIX_ORBIT_VERSION}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <FeedbackWidget authContext="annix-orbit" />
      <NixAssistant
        context="general"
        pageContext={{ currentPage: "Annix Orbit Recruiter", portalContext: "general" }}
      />
    </div>
  );
}

export default function RecruiterPortalLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288] mx-auto" />
        </div>
      }
    >
      <NixAppProvider appCode="annix-orbit">
        <RecruiterPortalContent>{children}</RecruiterPortalContent>
      </NixAppProvider>
    </Suspense>
  );
}
