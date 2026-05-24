import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreatePromoCodePayload,
  type PromoCode,
  promoCodeAdminApi,
  type UpdatePromoCodePayload,
} from "@/app/lib/api/promoCodeAdminApi";
import { licensingKeys } from "../../keys";

export function usePromoCodes() {
  return useQuery<PromoCode[]>({
    queryKey: licensingKeys.promoCodes(),
    queryFn: () => promoCodeAdminApi.list(),
  });
}

export function useCreatePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePromoCodePayload) => promoCodeAdminApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: licensingKeys.promoCodes() });
    },
  });
}

export function useUpdatePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePromoCodePayload }) =>
      promoCodeAdminApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: licensingKeys.promoCodes() });
    },
  });
}

export function useDeletePromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => promoCodeAdminApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: licensingKeys.promoCodes() });
    },
  });
}
