"use client";

import {
  Award,
  Bell,
  Calculator,
  CalendarDays,
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
import { useState } from "react";
import { COMPLY_SA_VERSION } from "@/app/comply-sa/config/version";

type NavGroup = {
  label: string;
  items: Array<{ href: string; label: string; icon: React.ElementType }>;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/comply-sa/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/comply-sa/regulatory", label: "Regulatory Updates", icon: Newspaper },
    ],
  },
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

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-teal-500/10 text-teal-400"
          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function SidebarNav({ pathname, onItemClick }: { pathname: string; onItemClick?: () => void }) {
  return (
    <nav className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  pathname === item.href ||
                  (item.href !== "/comply-sa/dashboard" && pathname.startsWith(`${item.href}/`))
                }
                onClick={onItemClick}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/comply-sa/auth/login");
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-40 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link href="/comply-sa/dashboard" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-teal-400" />
              <span className="text-lg font-bold text-white">Comply SA</span>
              <span className="text-xs text-slate-500 font-normal">v{COMPLY_SA_VERSION}</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {ALL_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href ? "text-teal-400" : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-slate-900/80 backdrop-blur-sm">
          <div className="fixed top-14 left-0 w-64 h-full bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto">
            <SidebarNav pathname={pathname} onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-700 min-h-[calc(100vh-57px)] bg-slate-800/50 p-4">
          <SidebarNav pathname={pathname} />
        </aside>

        <main className="flex-1 p-4 lg:p-6 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
