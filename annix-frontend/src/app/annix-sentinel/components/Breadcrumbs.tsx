"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  group: string;
};

const NAV_LOOKUP: NavItem[] = [
  { href: "/annix-sentinel/dashboard", label: "Dashboard", group: "Main" },
  { href: "/annix-sentinel/regulatory", label: "Regulatory Updates", group: "Main" },
  { href: "/annix-sentinel/documents", label: "Documents", group: "Compliance" },
  { href: "/annix-sentinel/templates", label: "Templates", group: "Compliance" },
  { href: "/annix-sentinel/tender", label: "Tender Pack", group: "Compliance" },
  { href: "/annix-sentinel/health-report", label: "Health Report", group: "Compliance" },
  { href: "/annix-sentinel/bbee", label: "B-BBEE Tools", group: "Tools" },
  { href: "/annix-sentinel/tax-tools", label: "Tax Tools", group: "Tools" },
  { href: "/annix-sentinel/tax-calendar", label: "Tax Calendar", group: "Tools" },
  { href: "/annix-sentinel/seta-grants", label: "SETA Grants", group: "Tools" },
  { href: "/annix-sentinel/hr-tools", label: "HR Tools", group: "Tools" },
  { href: "/annix-sentinel/ai-assistant", label: "AI Assistant", group: "Tools" },
  { href: "/annix-sentinel/advisor", label: "Client Overview", group: "Advisor" },
  { href: "/annix-sentinel/advisor/calendar", label: "Deadline Calendar", group: "Advisor" },
  { href: "/annix-sentinel/notifications", label: "Notifications", group: "Account" },
  { href: "/annix-sentinel/settings", label: "Settings", group: "Account" },
  { href: "/annix-sentinel/api-keys", label: "API Keys", group: "Account" },
  { href: "/annix-sentinel/integrations", label: "Integrations", group: "Account" },
];

function matchedNavItem(pathname: string): NavItem | null {
  const exact = NAV_LOOKUP.find((item) => item.href === pathname);
  if (exact) {
    return exact;
  }
  const parent = NAV_LOOKUP.filter(
    (item) => item.href !== "/annix-sentinel/dashboard" && pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return parent ?? null;
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/annix-sentinel/dashboard") {
    return null;
  }

  const navItem = matchedNavItem(pathname);
  if (!navItem) {
    return null;
  }

  const showGroup = navItem.group !== "Main";

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-4">
      <Link
        href="/annix-sentinel/dashboard"
        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        Home
      </Link>
      {showGroup && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
          <span className="text-slate-500 dark:text-slate-400">{navItem.group}</span>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
      <span className="text-slate-900 dark:text-white font-medium">{navItem.label}</span>
    </nav>
  );
}
