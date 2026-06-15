import {
  DEFAULT_MARKETING_LOCALE,
  type MarketingLocale,
  type MarketingSiteContent,
  type MarketingSiteStatus,
} from "@annix/product-data/marketing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketingAdminApi } from "@/app/lib/marketing/api";
import { marketingKeys } from "../../keys";

export function useMarketingDraft(locale: MarketingLocale = DEFAULT_MARKETING_LOCALE) {
  return useQuery<MarketingSiteContent>({
    queryKey: marketingKeys.draft(locale),
    queryFn: () => marketingAdminApi.draft(locale),
  });
}

export function useMarketingLocales() {
  return useQuery<MarketingLocale[]>({
    queryKey: marketingKeys.locales(),
    queryFn: () => marketingAdminApi.locales(),
  });
}

export function useMarketingStatus() {
  return useQuery<MarketingSiteStatus>({
    queryKey: marketingKeys.status(),
    queryFn: () => marketingAdminApi.status(),
  });
}

export function useSaveMarketingDraft(locale: MarketingLocale = DEFAULT_MARKETING_LOCALE) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: MarketingSiteContent) => marketingAdminApi.saveDraft(content, locale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.all });
    },
  });
}

export function useTranslateMarketing(locale: MarketingLocale) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketingAdminApi.translate(locale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.all });
    },
  });
}

export function usePublishMarketing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketingAdminApi.publish(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.all });
    },
  });
}

export function useDiscardMarketingDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketingAdminApi.discardDraft(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.all });
    },
  });
}
