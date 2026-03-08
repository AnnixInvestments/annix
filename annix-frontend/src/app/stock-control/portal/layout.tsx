"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { MobileNav } from "../components/MobileNav";
import { StockControlHeader } from "../components/StockControlHeader";
import {
  StockControlBrandingProvider,
  useStockControlBranding,
} from "../context/StockControlBrandingContext";
import { StockControlRbacProvider } from "../context/StockControlRbacContext";
import { useIsMobile } from "../hooks/useMediaQuery";

function MainContent({ children }: { children: React.ReactNode }) {
  const { heroImageUrl } = useStockControlBranding();

  return (
    <main
      className="flex-1 overflow-y-auto p-3 sm:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
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
      <div className="w-full">{children}</div>
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
      <StockControlRbacProvider>
        <div className="flex flex-col h-screen bg-gray-50">
          {isMobile && <MobileNav isOpen={mobileNavOpen} onClose={handleMobileNavClose} />}
          <StockControlHeader showMenuButton={isMobile} onMenuToggle={handleMenuToggle} />
          <MainContent>{children}</MainContent>
        </div>
      </StockControlRbacProvider>
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

export default function StockControlPortalLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
