"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { AuHeader } from "../components/AuHeader";

function MainContent({ children }: { children: React.ReactNode }) {
  const { branding } = useAuRubberBranding();
  const [heroObjectUrl, setHeroObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    if (branding.heroUrl) {
      const proxyUrl = auRubberApiClient.proxyImageUrl(branding.heroUrl);
      const headers = auRubberApiClient.authHeaders();
      fetch(proxyUrl, { headers })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!revoked && blob) {
            setHeroObjectUrl(URL.createObjectURL(blob));
          }
        })
        .catch(() => {
          if (!revoked) setHeroObjectUrl(null);
        });
    } else {
      setHeroObjectUrl(null);
    }
    return () => {
      revoked = true;
      if (heroObjectUrl) URL.revokeObjectURL(heroObjectUrl);
    };
  }, [branding.heroUrl]);

  return (
    <main
      className="flex-1 overflow-y-auto px-4 py-4 lg:px-6"
      style={
        heroObjectUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${heroObjectUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      <div className="max-w-[1600px] mx-auto">{children}</div>
    </main>
  );
}

function PortalContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AuHeader />
      <MainContent>{children}</MainContent>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuRubberAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/au-rubber/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <PortalContent>{children}</PortalContent>;
}

export default function AuRubberPortalLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto" />
        </div>
      }
    >
      <ProtectedLayout>{children}</ProtectedLayout>
    </Suspense>
  );
}
