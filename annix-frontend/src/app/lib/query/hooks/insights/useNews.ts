"use client";

import { useQuery } from "@tanstack/react-query";
import { insightsApi, type NewsItemDto } from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export interface UseNewsOptions {
  limit?: number;
  offset?: number;
  symbol?: string;
}

export function useNews(options: UseNewsOptions = {}) {
  return useQuery<{ items: NewsItemDto[]; total: number }>({
    queryKey: insightsKeys.news(options),
    queryFn: () => insightsApi.news.list(options),
    staleTime: 60 * 1000,
  });
}
