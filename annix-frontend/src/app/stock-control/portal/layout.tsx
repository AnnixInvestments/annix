"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { MobileNav } from "../components/MobileNav";
import { StockControlHeader } from "../components/StockControlHeader";
import { StockControlSidebar } from "../components/StockControlSidebar";
import {
  StockControlBrandingProvider,
  useStockControlBranding,
} from "../context/StockControlBrandingContext";
import { useIsMobile } from "../hooks/useMediaQuery";

function MainContent({ children }: { children: React.ReactNode }) {
  const { heroImageUrl } = useStockControlBranding();

  return (
    <main
      className="flex-1 overflow-y-auto p-6"
      style={
        heroImageUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </main>
  );
}

function PortalContent({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const handleMobileNavClose = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  return (
    <StockControlBrandingProvider>
      <div className="flex h-screen bg-gray-50">
        {!isMobile && <StockControlSidebar />}
        {isMobile && <MobileNav isOpen={mobileNavOpen} onClose={handleMobileNavClose} />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <StockControlHeader showMenuButton={isMobile} onMenuToggle={handleMenuToggle} />
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
