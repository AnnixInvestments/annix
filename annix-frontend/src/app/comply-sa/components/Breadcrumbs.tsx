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
  { href: "/comply-sa/dashboard", label: "Dashboard", group: "Main" },
  { href: "/comply-sa/regulatory", label: "Regulatory Updates", group: "Main" },
  { href: "/comply-sa/documents", label: "Documents", group: "Compliance" },
  { href: "/comply-sa/templates", label: "Templates", group: "Compliance" },
  { href: "/comply-sa/tender", label: "Tender Pack", group: "Compliance" },
  { href: "/comply-sa/health-report", label: "Health Report", group: "Compliance" },
  { href: "/comply-sa/bbee", label: "B-BBEE Tools", group: "Tools" },
  { href: "/comply-sa/tax-tools", label: "Tax Tools", group: "Tools" },
  { href: "/comply-sa/tax-calendar", label: "Tax Calendar", group: "Tools" },
  { href: "/comply-sa/seta-grants", label: "SETA Grants", group: "Tools" },
  { href: "/comply-sa/hr-tools", label: "HR Tools", group: "Tools" },
  { href: "/comply-sa/ai-assistant", label: "AI Assistant", group: "Tools" },
  { href: "/comply-sa/advisor", label: "Client Overview", group: "Advisor" },
  { href: "/comply-sa/advisor/calendar", label: "Deadline Calendar", group: "Advisor" },
  { href: "/comply-sa/notifications", label: "Notifications", group: "Account" },
  { href: "/comply-sa/settings", label: "Settings", group: "Account" },
  { href: "/comply-sa/api-keys", label: "API Keys", group: "Account" },
  { href: "/comply-sa/integrations", label: "Integrations", group: "Account" },
];

function matchedNavItem(pathname: string): NavItem | null {
  const exact = NAV_LOOKUP.find((item) => item.href === pathname);
  if (exact) {
    return exact;
  }
  const parent = NAV_LOOKUP.filter(
    (item) => item.href !== "/comply-sa/dashboard" && pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return parent ?? null;
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/comply-sa/dashboard") {
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
        href="/comply-sa/dashboard"
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
