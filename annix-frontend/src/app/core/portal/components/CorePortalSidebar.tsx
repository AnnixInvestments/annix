"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useFeatureFlagEnabled } from "@/app/lib/query/hooks";
import { type OpsNavItem, visibleNavGroups, visibleNavItems } from "@/app/ops/config/navItems";
import {
  ALL_NAV_ITEMS,
  isNavItemAllowedForRole,
  NAV_GROUP_ORDER,
} from "@/app/stock-control/config/navItems";
import { useStockControlRbac } from "@/app/stock-control/context/StockControlRbacContext";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
import { useCoreModules } from "../CorePortalModuleProvider";
import { type CoreApp, navItemBelongsToApp } from "../config/navAppMap";

const NIX_QUOTE_FLAG = "STOCK_MGMT_NIX_QUOTE_FROM_DOCUMENTS";

// Admin-only destinations the real SC portal surfaces in the header user-menu
// (StockControlHeader.tsx) rather than the main nav. Hosted here so SC admins
// in the unified shell aren't stranded without a Settings / Company Profile path.
const SC_ADMIN_LINKS: { key: string; label: string; href: string }[] = [
  {
    key: "company-profile",
    label: "Company Profile",
    href: "/core/portal/stock-control/company-profile",
  },
  { key: "settings", label: "Settings", href: "/core/portal/stock-control/settings" },
];

const APP_DISPLAY_NAME: Record<CoreApp, string> = {
  "stock-control": "Stock Control",
  "au-rubber": "AU Rubber",
};

const OPS_PORTAL_PREFIX = "/ops/portal/";
const SC_PORTAL_PREFIX = "/stock-control/portal/";

interface CoreNavItem {
  key: string;
  label: string;
  href: string;
}

interface CoreNavGroup {
  key: string;
  label: string;
  items: CoreNavItem[];
}

function rewriteToCore(href: string, prefix: string, activeApp: CoreApp): string {
  const startsWith = href.startsWith(prefix);
  if (!startsWith) {
    return `/core/portal/${activeApp}`;
  }
  const rest = href.slice(prefix.length);
  return `/core/portal/${activeApp}/${rest}`;
}

interface CorePortalSidebarProps {
  activeApp: CoreApp;
  permissions: string[];
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

function SidebarShell(props: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {props.isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={props.onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          props.isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {props.children}
      </aside>
    </>
  );
}

function NavSkeleton() {
  return (
    <div className="space-y-2 px-4 py-4" aria-busy="true" aria-label="Loading navigation">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="h-8 animate-pulse rounded-md bg-gray-100" />
      ))}
    </div>
  );
}

function EmptyNav() {
  return (
    <p className="px-4 py-6 text-center text-sm text-gray-500">
      No sections available — contact your administrator.
    </p>
  );
}

function SidebarNavList(props: { groups: CoreNavGroup[]; onNavigate: () => void }) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const totalItems = props.groups.reduce((sum, group) => sum + group.items.length, 0);
  if (totalItems === 0) {
    return <EmptyNav />;
  }

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const isActive = (href: string): boolean => {
    const base = href.split("?")[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  return (
    <>
      {props.groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        const hasLabel = group.label.length > 0;
        return (
          <div key={group.key} className="mb-1">
            {hasLabel && (
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center justify-between px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                <span>{group.label}</span>
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}

            {!isCollapsed && (
              <div className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={props.onNavigate}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-gray-100 font-semibold text-gray-900"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * Stock Control nav mirrors the REAL SC portal visibility model
 * (`stock-control/hooks/useVisibleNavItems`): role-based via
 * `isNavItemAllowedForRole(item, effectiveRole, rbacConfig)` plus the profile
 * QC / staff-leave gates — NOT the ops permission array. A non-admin therefore
 * sees exactly the nav set their role grants, not just Dashboard.
 */
function StockControlSidebarNav(props: { onNavigate: () => void }) {
  const { profile } = useStockControlAuth();
  const { rbacConfig, isLoaded } = useStockControlRbac();
  const { effectiveRole } = useViewAs();
  const nixQuote = useFeatureFlagEnabled(NIX_QUOTE_FLAG);
  const isNixQuoteEnabled = nixQuote.enabled;

  if (!isLoaded) {
    return <NavSkeleton />;
  }

  const qcEnabled = profile ? profile.qcEnabled === true : false;
  const staffLeaveEnabled = profile ? profile.staffLeaveEnabled === true : false;
  const isAdminRole = effectiveRole === "admin";

  const allowed = ALL_NAV_ITEMS.filter((item) => {
    if (!isNavItemAllowedForRole(item, effectiveRole, rbacConfig)) {
      return false;
    }
    if (item.requiresQc && !qcEnabled && !isAdminRole) {
      return false;
    }
    if (item.requiresStaffLeave && !staffLeaveEnabled) {
      return false;
    }
    // Mirror StockControlHeader's feature-flag gate so add-on entries
    // (e.g. "Mine Library") stay hidden when their flag is off.
    if (item.requiresFeatureFlag === NIX_QUOTE_FLAG) {
      return isNixQuoteEnabled;
    }
    return true;
  });

  const toItem = (item: (typeof ALL_NAV_ITEMS)[number]): CoreNavItem => ({
    key: item.key,
    label: item.label,
    href: rewriteToCore(item.href, SC_PORTAL_PREFIX, "stock-control"),
  });

  const ungrouped = allowed.filter((item) => !item.group);
  const leadingItems = ungrouped.filter((item) => !item.trailing).map(toItem);
  const trailingItems = ungrouped.filter((item) => item.trailing === true).map(toItem);

  const groupedGroups: CoreNavGroup[] = NAV_GROUP_ORDER.map((groupName) => {
    const groupItems = allowed.filter((item) => item.group === groupName).map(toItem);
    return { key: groupName, label: groupName, items: groupItems };
  }).filter((group) => group.items.length > 0);

  const adminGroup: CoreNavGroup | null = isAdminRole
    ? { key: "administration", label: "Administration", items: SC_ADMIN_LINKS }
    : null;

  const leadingGroup: CoreNavGroup | null =
    leadingItems.length > 0 ? { key: "overview", label: "", items: leadingItems } : null;
  const trailingGroup: CoreNavGroup | null =
    trailingItems.length > 0 ? { key: "trailing", label: "", items: trailingItems } : null;

  const groups = [leadingGroup, ...groupedGroups, adminGroup, trailingGroup].filter(
    (group): group is CoreNavGroup => group !== null,
  );

  return <SidebarNavList groups={groups} onNavigate={props.onNavigate} />;
}

/**
 * AU Rubber nav uses the ops nav config filtered to AU surfaces, gated by the
 * REAL AU permissions + admin flag from `useAuRubberAuth` (passed in via the
 * chrome) and a static rubber module set.
 */
function AuRubberSidebarNav(props: {
  permissions: string[];
  isAdmin: boolean;
  onNavigate: () => void;
}) {
  const modules = useCoreModules();
  const activeModules = modules.activeModules;
  const auAuth = useAuRubberAuth();

  if (auAuth.isLoading) {
    return <NavSkeleton />;
  }

  const permitted = visibleNavItems(activeModules, props.permissions, props.isAdmin);
  const items = permitted.filter((item) => navItemBelongsToApp(item.key, "au-rubber"));
  const opsGroups = visibleNavGroups(items);

  const toItem = (item: OpsNavItem): CoreNavItem => ({
    key: item.key,
    label: item.label,
    href: rewriteToCore(item.href, OPS_PORTAL_PREFIX, "au-rubber"),
  });

  const groups: CoreNavGroup[] = opsGroups.map((group) => ({
    key: group.key,
    label: group.key === "core" ? "" : group.label,
    items: group.items.map(toItem),
  }));

  return <SidebarNavList groups={groups} onNavigate={props.onNavigate} />;
}

export function CorePortalSidebar(props: CorePortalSidebarProps) {
  // TODO(#395 Phase 5): derive the wordmark/logo + accent colour per app from
  // `useBranding(activeApp)` / brand CSS vars. For now the active-app display
  // name provides identity and the accent stays neutral (no hardcoded per-app
  // hex, per CLAUDE.md branding rules).
  const wordmark = APP_DISPLAY_NAME[props.activeApp];

  return (
    <SidebarShell isOpen={props.isOpen} onClose={props.onClose}>
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
        <span className="text-lg font-semibold text-gray-900">{wordmark}</span>
        <button
          type="button"
          onClick={props.onClose}
          className="rounded p-1 text-gray-500 hover:text-gray-700 lg:hidden"
          aria-label="Close navigation"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <nav className="h-[calc(100vh-3.5rem)] overflow-y-auto py-2">
        {props.activeApp === "stock-control" ? (
          <StockControlSidebarNav onNavigate={props.onClose} />
        ) : (
          <AuRubberSidebarNav
            permissions={props.permissions}
            isAdmin={props.isAdmin}
            onNavigate={props.onClose}
          />
        )}
      </nav>
    </SidebarShell>
  );
}
