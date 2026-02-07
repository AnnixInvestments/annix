import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config'
import { boqKeys, type BoqQueryParams } from '../../keys'

interface Boq {
  id: number
  boqNumber: string
  title: string
  description?: string
  status: string
  totalQuantity?: number
  totalWeightKg?: number
  totalEstimatedCost?: number
  createdBy: {
    id: number
    username: string
  }
  drawing?: {
    id: number
    drawingNumber: string
  }
  rfq?: {
    id: number
    rfqNumber: string
  }
  createdAt: string
  updatedAt: string
}

interface PaginatedBoqResult {
  data: Boq[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface BoqLineItem {
  id: number
  lineNumber: number
  itemCode?: string
  description: string
  itemType: string
  unitOfMeasure: string
  quantity: number
  unitWeightKg?: number
  totalWeightKg?: number
  unitPrice?: number
  totalPrice?: number
  notes?: string
  drawingReference?: string
}

interface BoqDetail extends Boq {
  lineItems: BoqLineItem[]
}

interface UploadResult {
  boq: Boq
  warnings: string[]
}

async function fetchBoqs(params?: BoqQueryParams): Promise<PaginatedBoqResult> {
  const searchParams = new URLSearchParams()
  searchParams.set('page', (params?.page ?? 1).toString())
  searchParams.set('limit', (params?.limit ?? 20).toString())
  if (params?.status && params.status !== 'all') {
    searchParams.set('status', params.status)
  }
  if (params?.search) {
    searchParams.set('search', params.search)
  }

  const response = await fetch(`${browserBaseUrl()}/boq?${searchParams.toString()}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch BOQs (${response.status}: ${body || response.statusText})`)
  }

  return response.json()
}

export function useBoqs(params?: BoqQueryParams) {
  return useQuery<PaginatedBoqResult>({
    queryKey: boqKeys.list(params),
    queryFn: () => fetchBoqs(params),
  })
}

async function uploadBoq(args: {
  file: File
  title: string
  description?: string
}): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', args.file)
  formData.append('title', args.title.trim())
  if (args.description?.trim()) {
    formData.append('description', args.description.trim())
  }

  const headers = getAuthHeaders()
  delete (headers as Record<string, string>)['Content-Type']

  const response = await fetch(`${browserBaseUrl()}/boq/upload`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message ||
      errorData.errors?.join(', ') ||
      `Failed to upload BOQ (${response.status})`,
    )
  }

  return response.json()
}

async function fetchBoqDetail(id: number): Promise<BoqDetail> {
  const response = await fetch(`${browserBaseUrl()}/boq/${id}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch BOQ (${response.status}: ${body || response.statusText})`)
  }

  return response.json()
}

export function useBoqDetail(id: number) {
  return useQuery<BoqDetail>({
    queryKey: boqKeys.detail(id),
    queryFn: () => fetchBoqDetail(id),
    enabled: id > 0,
  })
}

export function useUploadBoq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadBoq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.all })
    },
  })
}

export function useAddBoqLineItem(boqId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: Partial<BoqLineItem>) => {
      const response = await fetch(`${browserBaseUrl()}/boq/${boqId}/line-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(item),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to add line item')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.detail(boqId) })
    },
  })
}

export function useUpdateBoqLineItem(boqId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      updates,
    }: {
      itemId: number
      updates: Partial<BoqLineItem>
    }) => {
      const response = await fetch(
        `${browserBaseUrl()}/boq/${boqId}/line-items/${itemId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(updates),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to update line item')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.detail(boqId) })
    },
  })
}

export function useDeleteBoqLineItem(boqId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(
        `${browserBaseUrl()}/boq/${boqId}/line-items/${itemId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to delete line item')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.detail(boqId) })
    },
  })
}

export function useSubmitBoqForReview(boqId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${browserBaseUrl()}/workflow/boqs/${boqId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to submit for review')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.detail(boqId) })
      queryClient.invalidateQueries({ queryKey: boqKeys.all })
    },
  })
}

export type { Boq, BoqDetail, BoqLineItem, PaginatedBoqResult, UploadResult }
