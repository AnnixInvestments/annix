"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type GlobalSearchResponse,
  type GlobalSearchResultItem,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";

const RECENT_SEARCHES_KEY = "sc_recent_searches";
const RECENT_VISITED_KEY = "sc_recent_visited";
const MAX_RECENT = 8;

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_CONFIG: Record<
  GlobalSearchResultItem["type"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  job_card: {
    label: "Job Card",
    color: "bg-blue-100 text-blue-700",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  stock_item: {
    label: "Stock Item",
    color: "bg-green-100 text-green-700",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
  staff: {
    label: "Staff",
    color: "bg-purple-100 text-purple-700",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  delivery_note: {
    label: "Delivery Note",
    color: "bg-amber-100 text-amber-700",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  invoice: {
    label: "Invoice",
    color: "bg-red-100 text-red-700",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  purchase_order: {
    label: "Purchase Order",
    color: "bg-teal-100 text-teal-700",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
};

function loadRecent(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(key: string, items: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    // storage full or unavailable
  }
}

interface RecentVisited {
  href: string;
  title: string;
  type: GlobalSearchResultItem["type"];
}

function loadRecentVisited(): RecentVisited[] {
  try {
    const raw = localStorage.getItem(RECENT_VISITED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentVisited(item: RecentVisited): void {
  try {
    const existing = loadRecentVisited();
    const filtered = existing.filter((v) => v.href !== item.href);
    const updated = [item, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_VISITED_KEY, JSON.stringify(updated));
  } catch {
    // storage full or unavailable
  }
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentVisited, setRecentVisited] = useState<RecentVisited[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(loadRecent(RECENT_SEARCHES_KEY));
      setRecentVisited(loadRecentVisited());
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setSearchPerformed(false);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchPerformed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response: GlobalSearchResponse = await stockControlApiClient.globalSearch(trimmed);
      setResults(response.results);
      setSearchPerformed(true);
      setSelectedIndex(0);
    } catch {
      setResults([]);
      setSearchPerformed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch],
  );

  const navigateToResult = useCallback(
    (result: GlobalSearchResultItem) => {
      const searches = loadRecent(RECENT_SEARCHES_KEY);
      const updatedSearches = [query.trim(), ...searches.filter((s) => s !== query.trim())];
      saveRecent(RECENT_SEARCHES_KEY, updatedSearches);

      saveRecentVisited({ href: result.href, title: result.title, type: result.type });

      onClose();
      router.push(result.href);
    },
    [query, onClose, router],
  );

  const handleRecentSearchClick = useCallback(
    (search: string) => {
      setQuery(search);
      performSearch(search);
    },
    [performSearch],
  );

  const handleRecentVisitedClick = useCallback(
    (item: RecentVisited) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  const clearRecentSearches = useCallback(() => {
    saveRecent(RECENT_SEARCHES_KEY, []);
    setRecentSearches([]);
  }, []);

  const groupedResults = results.reduce<Record<string, GlobalSearchResultItem[]>>(
    (acc, result) => ({
      ...acc,
      [result.type]: [...(acc[result.type] || []), result],
    }),
    {},
  );

  const flatResults = Object.values(groupedResults).flat();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (flatResults.length > 0) {
          setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && flatResults[selectedIndex]) {
        e.preventDefault();
        navigateToResult(flatResults[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [flatResults, selectedIndex, navigateToResult, onClose],
  );

  useEffect(() => {
    const selectedEl = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) {
    return null;
  }

  const showRecents = query.trim().length < 2 && !searchPerformed;
  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-modal-title"
    >
      <div className="fixed inset-0 bg-black/10 backdrop-blur-md" />
      <div className="flex items-start justify-center min-h-screen pt-[10vh] px-4 pb-20">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
          <h2 id="global-search-modal-title" className="sr-only">
            Search
          </h2>
          <div className="flex items-center px-4 border-b border-gray-200">
            <svg
              className="w-5 h-5 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search job cards, stock items, staff, deliveries..."
              className="flex-1 px-3 py-4 text-base bg-transparent border-0 outline-none focus:ring-0 placeholder-gray-400"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded font-mono">
              ESC
            </kbd>
          </div>

          <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-500">Searching...</span>
              </div>
            )}

            {!loading && searchPerformed && results.length === 0 && (
              <div className="py-12 text-center">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500">No results for &ldquo;{query.trim()}&rdquo;</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}

            {!loading && showRecents && (
              <div className="py-3">
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between px-4 mb-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Recent Searches
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400 mr-3 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {search}
                      </button>
                    ))}
                  </div>
                )}

                {recentVisited.length > 0 && (
                  <div>
                    <div className="px-4 mb-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Recently Visited
                      </span>
                    </div>
                    {recentVisited.map((item) => {
                      const config = TYPE_CONFIG[item.type];
                      return (
                        <button
                          key={item.href}
                          onClick={() => handleRecentVisitedClick(item)}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded mr-3 shrink-0 ${config.color}`}
                          >
                            {config.icon}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {recentSearches.length === 0 && recentVisited.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">
                      Type at least 2 characters to start searching
                    </p>
                  </div>
                )}
              </div>
            )}

            {!loading &&
              Object.entries(groupedResults).map(([type, items]) => {
                const config = TYPE_CONFIG[type as GlobalSearchResultItem["type"]];
                return (
                  <div key={type} className="py-2">
                    <div className="px-4 py-1.5">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {config.label}s
                      </span>
                    </div>
                    {items.map((result) => {
                      flatIndex += 1;
                      const currentIndex = flatIndex;
                      const isSelected = currentIndex === selectedIndex;
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          data-index={currentIndex}
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={`w-full flex items-center px-4 py-2.5 text-left transition-colors ${
                            isSelected ? "bg-teal-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mr-3 shrink-0 ${config.color}`}
                          >
                            {config.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </div>
                            {result.subtitle && (
                              <div className="text-xs text-gray-500 truncate">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                          {result.status && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 shrink-0">
                              {result.status}
                            </span>
                          )}
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-gray-400 ml-2 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↵</kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">esc</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
