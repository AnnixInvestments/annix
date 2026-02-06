import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  supplierPortalApi,
  type SupplierBoqListItem,
  type SupplierBoqStatus,
} from '@/app/lib/api/supplierApi'
import { supplierKeys } from '../../keys'

export function useSupplierBoqs(status?: SupplierBoqStatus) {
  return useQuery<SupplierBoqListItem[]>({
    queryKey: supplierKeys.boqs.list(status),
    queryFn: () => supplierPortalApi.getMyBoqs(status),
  })
}

export function useDeclineBoq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boqId, reason }: { boqId: number; reason: string }) =>
      supplierPortalApi.declineBoq(boqId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.boqs.all })
    },
  })
}

export function useMarkBoqViewed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boqId: number) => supplierPortalApi.markBoqViewed(boqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.boqs.all })
    },
  })
}

export function useSetBoqReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boqId,
      reminderDays,
    }: {
      boqId: number
      reminderDays: string
    }) => supplierPortalApi.setBoqReminder(boqId, reminderDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.boqs.all })
    },
  })
}
