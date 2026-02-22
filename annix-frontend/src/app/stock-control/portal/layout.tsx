"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { StockControlHeader } from "../components/StockControlHeader";
import { StockControlSidebar } from "../components/StockControlSidebar";
import {
  StockControlBrandingProvider,
  useStockControlBranding,
} from "../context/StockControlBrandingContext";

function MainContent({ children }: { children: React.ReactNode }) {
  const { heroImageUrl } = useStockControlBranding();

  return (
    <main
      className="flex-1 overflow-y-auto p-6 relative"
      style={
        heroImageUrl
          ? {
              backgroundImage: `url(${heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      {heroImageUrl ? <div className="absolute inset-0 bg-black/30 pointer-events-none" /> : null}
      <div className="relative max-w-7xl mx-auto">{children}</div>
    </main>
  );
}

function PortalContent({ children }: { children: React.ReactNode }) {
  return (
    <StockControlBrandingProvider>
      <div className="flex h-screen bg-gray-50">
        <StockControlSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <StockControlHeader />
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </StockControlBrandingProvider>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useStockControlAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/stock-control/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
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

export default function StockControlPortalLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
