import type { MarketingSiteContent, MarketingSiteStatus } from "@annix/product-data/marketing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketingAdminApi } from "@/app/lib/marketing/api";
import { marketingKeys } from "../../keys";

export function useMarketingDraft() {
  return useQuery<MarketingSiteContent>({
    queryKey: marketingKeys.draft(),
    queryFn: () => marketingAdminApi.draft(),
  });
}

export function useMarketingStatus() {
  return useQuery<MarketingSiteStatus>({
    queryKey: marketingKeys.status(),
    queryFn: () => marketingAdminApi.status(),
  });
}

export function useSaveMarketingDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: MarketingSiteContent) => marketingAdminApi.saveDraft(content),
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
