import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  rubberPortalApi,
  type RubberOrderDto,
  type RubberCompanyDto,
  type RubberProductDto,
  type RubberProductCodingDto,
  type RubberPricingTierDto,
  type CreateRubberProductDto,
} from '@/app/lib/api/rubberPortalApi'
import { rubberKeys } from '../../keys'

export function useRubberOrders(status?: number) {
  return useQuery<RubberOrderDto[]>({
    queryKey: rubberKeys.orders.list(status),
    queryFn: () => rubberPortalApi.orders(status),
  })
}

export function useRubberCompanies() {
  return useQuery<RubberCompanyDto[]>({
    queryKey: rubberKeys.companies.list(),
    queryFn: () => rubberPortalApi.companies(),
  })
}

export function useRubberProducts() {
  return useQuery<RubberProductDto[]>({
    queryKey: rubberKeys.products.list(),
    queryFn: () => rubberPortalApi.products(),
  })
}

export function useRubberOrderStatuses() {
  return useQuery<{ value: number; label: string }[]>({
    queryKey: rubberKeys.statuses.list(),
    queryFn: () => rubberPortalApi.orderStatuses(),
  })
}

export function useRubberCodings(codingType?: string) {
  return useQuery<RubberProductCodingDto[]>({
    queryKey: rubberKeys.codings.list(codingType),
    queryFn: () => rubberPortalApi.productCodings(codingType),
    enabled: codingType !== undefined,
  })
}

export function useRubberPricingTiers() {
  return useQuery<RubberPricingTierDto[]>({
    queryKey: rubberKeys.pricingTiers.list(),
    queryFn: () => rubberPortalApi.pricingTiers(),
  })
}

export function useCreateRubberOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof rubberPortalApi.createOrder>[0]) =>
      rubberPortalApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.orders.all })
    },
  })
}

export function useDeleteRubberOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rubberPortalApi.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.orders.all })
    },
  })
}

export function useDeleteRubberProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rubberPortalApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.products.all })
    },
  })
}

export function useSaveRubberCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id?: number; payload: Parameters<typeof rubberPortalApi.createCompany>[0] }) => {
      if (data.id) {
        return rubberPortalApi.updateCompany(data.id, data.payload)
      }
      return rubberPortalApi.createCompany(data.payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.companies.all })
    },
  })
}

export function useDeleteRubberCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rubberPortalApi.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.companies.all })
    },
  })
}

export function useSaveRubberCoding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id?: number; payload: Omit<RubberProductCodingDto, 'id' | 'firebaseUid'> }) => {
      if (data.id) {
        return rubberPortalApi.updateProductCoding(data.id, { code: data.payload.code, name: data.payload.name })
      }
      return rubberPortalApi.createProductCoding(data.payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.codings.all })
    },
  })
}

export function useDeleteRubberCoding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rubberPortalApi.deleteProductCoding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.codings.all })
    },
  })
}

export function useSaveRubberPricingTier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id?: number; payload: Omit<RubberPricingTierDto, 'id'> }) => {
      if (data.id) {
        return rubberPortalApi.updatePricingTier(data.id, data.payload)
      }
      return rubberPortalApi.createPricingTier(data.payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.pricingTiers.all })
    },
  })
}

export function useDeleteRubberPricingTier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rubberPortalApi.deletePricingTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubberKeys.pricingTiers.all })
    },
  })
}
