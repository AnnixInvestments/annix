"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLoginScreen } from "@/app/lib/navigation-utils";
import { useBranding } from "@/app/lib/query/hooks";
import AdminLoginButton from "./AdminLoginButton";
import AnnixLogo from "./AnnixLogo";
import { BrandNavLockup } from "./BrandNavLockup";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

const MASTER_BRAND = "annix-investments";
const DARK_NAVBAR_FALLBACK = "#323288";
const LIGHT_NAVBAR_FALLBACK = "#F2F4F7";
const ACCENT_FALLBACK = "#FF8A00";

const isPortalRoute = (pathname: string): boolean => {
  if (isLoginScreen(pathname)) {
    return false;
  }
  return (
    pathname.startsWith("/customer/portal") ||
    pathname.startsWith("/supplier/portal") ||
    pathname.startsWith("/admin/portal") ||
    pathname.startsWith("/annix-sentinel") ||
    pathname.startsWith("/teacher-assistant")
  );
};

const isRfqRoute = (pathname: string): boolean => {
  return (
    pathname.startsWith("/rfq-portal") ||
    pathname.startsWith("/rfq") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/customer") ||
    pathname.startsWith("/supplier") ||
    pathname.startsWith("/admin")
  );
};

const isHomePage = (pathname: string): boolean => {
  return pathname === "/";
};

export default function Navigation() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const brandingQuery = useBranding(MASTER_BRAND);
  const brandingData = brandingQuery.data;
  const branding = brandingData ?? null;

  if (isPortalRoute(pathname)) {
    return null;
  }

  const showRfqNav = isRfqRoute(pathname);
  const showHomeNav = isHomePage(pathname);

  const isLight = resolvedTheme === "light";
  const lightNav = branding?.navbarColorLight;
  const darkNav = branding?.navbarColor;
  const dynamicNavbar = isLight
    ? lightNav || LIGHT_NAVBAR_FALLBACK
    : darkNav || DARK_NAVBAR_FALLBACK;
  const navbarColor = showHomeNav ? dynamicNavbar : "#323288";
  const accent = branding?.accentOrange;
  const accentColor = accent || ACCENT_FALLBACK;

  return (
    <nav
      className="sticky top-0 z-50 shadow-lg amix-toolbar transition-colors"
      style={{ backgroundColor: navbarColor }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {showHomeNav ? (
                <BrandNavLockup brand={MASTER_BRAND} />
              ) : (
                <AnnixLogo size="sm" showText useSignatureFont />
              )}
            </Link>

            {showHomeNav && (
              <div className="flex gap-1">
                <span className="px-4 py-2 rounded-lg font-semibold" style={{ color: accentColor }}>
                  Select an application below
                </span>
              </div>
            )}

            {showRfqNav && (
              <div className="flex gap-1">
                <Link
                  href="/rfq-portal"
                  className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    pathname === "/rfq-portal" ? "bg-[#FF8A00]" : "hover:bg-[#4a4da3]"
                  }`}
                  style={{ color: pathname === "/rfq-portal" ? "#323288" : "#FF8A00" }}
                >
                  RFQ Home
                </Link>
                <Link
                  href="/rfq"
                  className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    pathname === "/rfq" ||
                    (pathname.startsWith("/rfq/") && !pathname.startsWith("/rfq-portal"))
                      ? "bg-[#FF8A00]"
                      : "hover:bg-[#4a4da3]"
                  }`}
                  style={{
                    color:
                      pathname === "/rfq" ||
                      (pathname.startsWith("/rfq/") && !pathname.startsWith("/rfq-portal"))
                        ? "#323288"
                        : "#FF8A00",
                  }}
                >
                  Create an RFQ
                </Link>
                <Link
                  href="/pricing"
                  className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    pathname === "/pricing" ? "bg-[#FF8A00]" : "hover:bg-[#4a4da3]"
                  }`}
                  style={{ color: pathname === "/pricing" ? "#323288" : "#FF8A00" }}
                >
                  Pricing
                </Link>
                <Link
                  href="/about"
                  className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    pathname === "/about" ? "bg-[#FF8A00]" : "hover:bg-[#4a4da3]"
                  }`}
                  style={{ color: pathname === "/about" ? "#323288" : "#FF8A00" }}
                >
                  About
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showHomeNav && <AdminLoginButton />}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
