"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import { BrandedLoader } from "@/app/lib/branding/components/BrandedLoader";
import { OrbitModulePwaMeta } from "../components/OrbitModulePwaMeta";
import { ANNIX_ORBIT_VERSION } from "../config/version";

const navItems: NavItem[] = [
  {
    href: "/annix/orbit/student/dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/annix/orbit/student/futurepath",
    label: "FuturePath",
    icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z M12 14l-9-5",
  },
  {
    href: "/annix/orbit/student/guardian",
    label: "For Parents",
    icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.83-4M6 11a3 3 0 10-2.83-4",
  },
];

function StudentContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, logout } = useAnnixOrbitAuth();
  const isStudent = user?.userType === "student";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/annix/orbit/login?type=student&returnUrl=${returnUrl}`);
      return;
    }
    if (user && !isStudent) {
      router.push("/annix/orbit");
    }
  }, [isLoading, isAuthenticated, user, isStudent, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BrandedLoader brand="annix-orbit" label="Loading…" />
      </div>
    );
  }

  if (!isAuthenticated || (user && !isStudent)) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/annix/orbit/login?type=student");
  };

  const userName = user?.name;
  const nameParts = (userName || "").split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

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

export default function StudentLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <>
      <OrbitModulePwaMeta module="student" />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <BrandedLoader brand="annix-orbit" label="Loading…" />
          </div>
        }
      >
        <StudentContent>{children}</StudentContent>
      </Suspense>
    </>
  );
}
