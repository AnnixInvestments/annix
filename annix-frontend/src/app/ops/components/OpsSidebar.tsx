"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { type OpsNavItem, visibleNavGroups, visibleNavItems } from "../config/navItems";
import { useOpsModules } from "../context/OpsModuleContext";

interface OpsSidebarProps {
  permissions: string[];
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function OpsSidebar(props: OpsSidebarProps) {
  const pathname = usePathname();
  const { activeModules } = useOpsModules();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const items = visibleNavItems(activeModules, props.permissions, props.isAdmin);
  const groups = visibleNavGroups(items);

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

  const isActive = (item: OpsNavItem): boolean => {
    const itemPath = item.href.split("?")[0];
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  };

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          props.isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Annix Ops</span>
          <button
            type="button"
            onClick={props.onClose}
            className="lg:hidden p-1 rounded text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="overflow-y-auto h-[calc(100vh-3.5rem)] py-2">
          {groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key);
            const hasActiveItem = group.items.some(isActive);

            return (
              <div key={group.key} className="mb-1">
                {group.key !== "core" && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex items-center justify-between w-full px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>{group.label}</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
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
                      const active = isActive(item);
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={props.onClose}
                          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                            active
                              ? "bg-teal-50 text-teal-700 font-medium"
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
        </nav>
      </aside>
    </>
  );
}
