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

export function useUploadBoq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadBoq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.all })
    },
  })
}

export type { Boq, PaginatedBoqResult, UploadResult }
