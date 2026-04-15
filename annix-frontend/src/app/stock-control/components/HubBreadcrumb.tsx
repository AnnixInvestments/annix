"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ALL_NAV_ITEMS, NAV_GROUP_HUB_PATHS } from "../config/navItems";

export function HubBreadcrumb() {
  const pathname = usePathname();

  const breadcrumb = useMemo(() => {
    const matchedItems = ALL_NAV_ITEMS.filter(
      (item) => item.group && item.group !== "hidden" && pathname.startsWith(item.href),
    ).sort((a, b) => b.href.length - a.href.length);
    const firstMatchedItem = matchedItems[0];
    const matchedItem = firstMatchedItem ?? null;
    if (!matchedItem?.group) return null;

    const groupName = matchedItem.group;
    const hubPath = NAV_GROUP_HUB_PATHS[groupName];
    if (!hubPath || pathname === hubPath) return null;

    return { groupName, hubPath, itemLabel: matchedItem.label };
  }, [pathname]);

  if (!breadcrumb) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <Link
        href={breadcrumb.hubPath}
        className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        {breadcrumb.groupName}
      </Link>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="text-gray-900 dark:text-gray-100 font-medium">{breadcrumb.itemLabel}</span>
    </nav>
  );
}
