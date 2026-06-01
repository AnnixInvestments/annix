"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import { BrandedLoader } from "@/app/lib/branding/components/BrandedLoader";
import { useOrbitMyProfileStatus } from "@/app/lib/query/hooks";
import { ANNIX_ORBIT_VERSION } from "../config/version";

const navItems: NavItem[] = [
  {
    href: "/annix/orbit/seeker/dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/annix/orbit/seeker/profile",
    label: "My CV",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h3",
  },
  {
    href: "/annix/orbit/seeker/profile/trade",
    label: "Trade profile",
    icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
  },
  {
    href: "/annix/orbit/seeker/profile/credentials",
    label: "Credentials",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    href: "/annix/orbit/seeker/jobs",
    label: "Browse Jobs",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    href: "/annix/orbit/seeker/applications",
    label: "Applications",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    href: "/annix/orbit/seeker/calendar",
    label: "Interviews",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    href: "/annix/orbit/seeker/settings",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
  {
    href: "/annix/orbit/seeker/how-to",
    label: "Help",
    icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

function SeekerContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, profile, logout } = useAnnixOrbitAuth();
  const userType = user?.userType;
  const hasIndividualProfile = profile !== null && profile.companyId === null;
  const isIndividual = userType === "individual" || hasIndividualProfile;
  const profileStatusQuery = useOrbitMyProfileStatus(isAuthenticated && isIndividual);
  const profileStatus = profileStatusQuery.data;
  const hasCv = profileStatus ? profileStatus.hasCv : null;
  const isOnProfilePage = pathname.startsWith("/annix/orbit/seeker/profile");
  const isOnSettingsPage = pathname.startsWith("/annix/orbit/seeker/settings");
  const isOnJobsPage = pathname.startsWith("/annix/orbit/seeker/jobs");
  const isOnHowToPage = pathname.startsWith("/annix/orbit/seeker/how-to");
  const isOnDashboardPage = pathname.startsWith("/annix/orbit/seeker/dashboard");
  const isOnApplicationsPage = pathname.startsWith("/annix/orbit/seeker/applications");
  const isOnCalendarPage = pathname.startsWith("/annix/orbit/seeker/calendar");
  const isOnEeAttributesPage = pathname.startsWith("/annix/orbit/seeker/ee-attributes");
  const cvGateExempt =
    isOnProfilePage ||
    isOnSettingsPage ||
    isOnJobsPage ||
    isOnHowToPage ||
    isOnDashboardPage ||
    isOnApplicationsPage ||
    isOnCalendarPage ||
    isOnEeAttributesPage;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/annix/orbit/login?type=individual&returnUrl=${returnUrl}`);
      return;
    }
    if (user && !isIndividual) {
      router.push("/annix/orbit/portal/dashboard");
      return;
    }
    if (isIndividual && hasCv === false && !cvGateExempt) {
      router.push("/annix/orbit/seeker/profile");
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    isIndividual,
    hasCv,
    cvGateExempt,
    router,
    pathname,
    searchParams,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BrandedLoader brand="annix-orbit" label="Loading…" />
      </div>
    );
  }

  if (!isAuthenticated || (user && !isIndividual)) {
    return null;
  }

  if (isIndividual && hasCv === false && !cvGateExempt) {
    return null;
  }

  if (isIndividual && profileStatusQuery.isError && !cvGateExempt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center max-w-md">
          <p className="text-sm text-red-700">
            We couldn't check your profile just now, so we can't safely load your workspace. Please
            try again.
          </p>
          <button
            type="button"
            onClick={() => void profileStatusQuery.refetch()}
            className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/annix/orbit/login?type=individual");
  };

  const userName = user?.name;
  const nameParts = (userName || "").split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  return (
    <div className="min-h-screen">
      <PortalToolbar
        portalType="annixOrbit"
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
        version={ANNIX_ORBIT_VERSION}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <FeedbackWidget authContext="annix-orbit" />
    </div>
  );
}

export default function SeekerLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <BrandedLoader brand="annix-orbit" label="Loading…" />
        </div>
      }
    >
      <SeekerContent>{children}</SeekerContent>
    </Suspense>
  );
}
