"use client";

import { toPairs as entries } from "es-toolkit/compat";
import { useCallback, useEffect, useState } from "react";
import type { SortConfig } from "@/app/components/shared/TableComponents";
import { opsApiFetch } from "../lib/api";

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UseOpsTableOptions {
  endpoint: string;
  defaultSort: SortConfig;
  defaultLimit?: number;
  extraParams?: Record<string, string>;
}

export interface UseOpsTableResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  search: string;
  sort: SortConfig;
  isLoading: boolean;
  setSearch: (value: string) => void;
  setPage: (value: number) => void;
  setLimit: (value: number) => void;
  handleSort: (key: string) => void;
  reload: () => void;
}

export function useOpsTable<T>(options: UseOpsTableOptions): UseOpsTableResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const defaultLimit = options.defaultLimit;
  const [limit, setLimit] = useState(defaultLimit || 25);
  const [search, setSearchRaw] = useState("");
  const [sort, setSort] = useState<SortConfig>(options.defaultSort);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const loadData = useCallback(async () => {
    void reloadTrigger;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) {
        params.set("search", search);
      }
      const extraParams = options.extraParams;
      if (extraParams) {
        for (const [k, v] of entries(extraParams)) {
          if (v) {
            params.set(k, v);
          }
        }
      }

      const result = await opsApiFetch<PageResult<T>>(`${options.endpoint}?${params.toString()}`);
      setItems(result.data);
      setTotal(result.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, options.endpoint, options.extraParams, reloadTrigger]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (key: string) => {
    if (sort.key === key) {
      setSort({ key, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, direction: "asc" });
    }
  };

  const setSearch = (value: string) => {
    setSearchRaw(value);
    setPage(1);
  };

  const reload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  return {
    items,
    total,
    page,
    limit,
    search,
    sort,
    isLoading,
    setSearch,
    setPage,
    setLimit,
    handleSort,
    reload,
  };
}

export function clientSort<T>(items: T[], sort: SortConfig): T[] {
  return [...items].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sort.key];
    const bVal = (b as unknown as Record<string, unknown>)[sort.key];
    const aStr = String(aVal ?? "");
    const bStr = String(bVal ?? "");
    const cmp = aStr.localeCompare(bStr);
    return sort.direction === "asc" ? cmp : -cmp;
  });
}
