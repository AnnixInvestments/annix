"use client";

import {
  Award,
  Bell,
  Calculator,
  CalendarDays,
  ChevronDown,
  FileCheck,
  FileStack,
  FileText,
  GraduationCap,
  HeartPulse,
  Key,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Newspaper,
  Plug,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Breadcrumbs from "@/app/comply-sa/components/Breadcrumbs";
import HelpLinks from "@/app/comply-sa/components/HelpLinks";
import { COMPLY_SA_VERSION } from "@/app/comply-sa/config/version";
import { ThemeToggle } from "@/app/components/ThemeToggle";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

type NavGroup = {
  label: string;
  items: NavItem[];
};

const TOP_LEVEL_LINKS: NavItem[] = [
  { href: "/comply-sa/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/comply-sa/regulatory", label: "Regulatory Updates", icon: Newspaper },
];

const DROPDOWN_GROUPS: NavGroup[] = [
  {
    label: "Compliance",
    items: [
      { href: "/comply-sa/documents", label: "Documents", icon: FileText },
      { href: "/comply-sa/templates", label: "Templates", icon: FileStack },
      { href: "/comply-sa/tender", label: "Tender Pack", icon: FileCheck },
      { href: "/comply-sa/health-report", label: "Health Report", icon: HeartPulse },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/comply-sa/bbee", label: "B-BBEE Tools", icon: Award },
      { href: "/comply-sa/tax-tools", label: "Tax Tools", icon: Calculator },
      { href: "/comply-sa/tax-calendar", label: "Tax Calendar", icon: CalendarDays },
      { href: "/comply-sa/seta-grants", label: "SETA Grants", icon: GraduationCap },
      { href: "/comply-sa/hr-tools", label: "HR Tools", icon: Users },
      { href: "/comply-sa/ai-assistant", label: "AI Assistant", icon: MessageSquare },
    ],
  },
  {
    label: "Advisor",
    items: [
      { href: "/comply-sa/advisor", label: "Client Overview", icon: Users },
      { href: "/comply-sa/advisor/calendar", label: "Deadline Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/comply-sa/notifications", label: "Notifications", icon: Bell },
      { href: "/comply-sa/settings", label: "Settings", icon: Settings },
      { href: "/comply-sa/api-keys", label: "API Keys", icon: Key },
      { href: "/comply-sa/integrations", label: "Integrations", icon: Plug },
    ],
  },
];

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/comply-sa/dashboard" && pathname.startsWith(`${href}/`));
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isRouteActive(pathname, item.href));
}

function DropdownMenu({
  group,
  pathname,
  isOpen,
  onToggle,
}: {
  group: NavGroup;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active = isGroupActive(pathname, group);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "text-teal-600 dark:text-teal-400"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        {group.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
          {group.items.map((item) => {
            const Icon = item.icon;
            const itemActive = isRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  itemActive
                    ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileMenu({
  pathname,
  onClose,
  onLogout,
}: {
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-400" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">Comply SA</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-57px)] p-4 space-y-6">
        <div>
          {TOP_LEVEL_LINKS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {DROPDOWN_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/comply-sa/auth/login");
  }

  function handleDropdownToggle(label: string) {
    setOpenDropdown(openDropdown === label ? null : label);
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Toggle menu"
              className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/comply-sa/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-teal-400" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">Comply SA</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                v{COMPLY_SA_VERSION}
              </span>
            </Link>
          </div>

          <div ref={navRef} className="hidden lg:flex items-center gap-1">
            {TOP_LEVEL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isRouteActive(pathname, item.href)
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {DROPDOWN_GROUPS.map((group) => (
              <DropdownMenu
                key={group.label}
                group={group}
                pathname={pathname}
                isOpen={openDropdown === group.label}
                onToggle={() => handleDropdownToggle(group.label)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle
              className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              iconClassName="w-5 h-5 text-slate-500 dark:text-slate-400"
            />
            <button
              type="button"
              aria-label="Log out"
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <MobileMenu
          pathname={pathname}
          onClose={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
        />
      )}

      <main className="p-4 lg:p-6 max-w-7xl mx-auto">
        <Breadcrumbs />
        {children}
        <HelpLinks />
      </main>
    </div>
  );
}
