"use client";

import { useCallback, useEffect, useState } from "react";

export interface TabDefinition {
  id: string;
  label: string;
  badge?: string | number | null;
  hidden?: boolean;
}

interface JobCardTabsProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function useJobCardTabs(tabs: TabDefinition[], defaultTab?: string) {
  const visibleTabs = tabs.filter((t) => !t.hidden);
  const firstVisibleTabId = visibleTabs[0]?.id;
  const initialTab = defaultTab || firstVisibleTabId || "";

  const [activeTab, setActiveTab] = useState(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (hash && visibleTabs.some((t) => t.id === hash)) {
        return hash;
      }
    }
    return initialTab;
  });

  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tabId}`);
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && visibleTabs.some((t) => t.id === hash)) {
        setActiveTab(hash);
        setVisitedTabs((prev) => new Set([...prev, hash]));
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [visibleTabs]);

  return { activeTab, visitedTabs, handleTabChange, visibleTabs };
}

export function JobCardTabs({ tabs, activeTab, onTabChange }: JobCardTabsProps) {
  const visibleTabs = tabs.filter((t) => !t.hidden);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const nextIndex =
      e.key === "ArrowRight"
        ? (currentIndex + 1) % visibleTabs.length
        : e.key === "ArrowLeft"
          ? (currentIndex - 1 + visibleTabs.length) % visibleTabs.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? visibleTabs.length - 1
              : -1;

    if (nextIndex >= 0) {
      e.preventDefault();
      onTabChange(visibleTabs[nextIndex].id);
      const tabElement = document.getElementById(`tab-${visibleTabs[nextIndex].id}`);
      tabElement?.focus();
    }
  };

  return (
    <div className="border-b border-gray-200" role="tablist" aria-label="Job card sections">
      <nav className="flex space-x-1 overflow-x-auto px-4 sm:px-6" aria-label="Tabs">
        {visibleTabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.badge !== null && tab.badge !== undefined && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

interface TabPanelProps {
  tabId: string;
  activeTab: string;
  visited: boolean;
  children: React.ReactNode;
}

export function TabPanel({ tabId, activeTab, visited, children }: TabPanelProps) {
  const isActive = tabId === activeTab;

  if (!visited) {
    return null;
  }

  return (
    <div
      id={`tabpanel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
      hidden={!isActive}
      className={isActive ? "py-6" : "hidden"}
    >
      {children}
    </div>
  );
}
