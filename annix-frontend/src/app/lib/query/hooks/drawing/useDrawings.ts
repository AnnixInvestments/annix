import { useQuery } from '@tanstack/react-query'
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config'
import { drawingKeys, type DrawingQueryParams } from '../../keys/drawingKeys'

interface Drawing {
  id: number
  drawingNumber: string
  title: string
  description?: string
  fileType: string
  fileSizeBytes: number
  currentVersion: number
  status: string
  uploadedBy: {
    id: number
    username: string
  }
  rfq?: {
    id: number
    rfqNumber: string
  }
  createdAt: string
  updatedAt: string
}

interface PaginatedDrawingResult {
  data: Drawing[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function fetchDrawings(
  params?: DrawingQueryParams,
): Promise<PaginatedDrawingResult> {
  const searchParams = new URLSearchParams()
  searchParams.set('page', (params?.page ?? 1).toString())
  searchParams.set('limit', (params?.limit ?? 20).toString())
  if (params?.status && params.status !== 'all') {
    searchParams.set('status', params.status)
  }
  if (params?.search) {
    searchParams.set('search', params.search)
  }

  const response = await fetch(
    `${browserBaseUrl()}/drawings?${searchParams.toString()}`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to fetch drawings (${response.status}: ${body || response.statusText})`,
    )
  }

  return response.json()
}

export function useDrawings(params?: DrawingQueryParams) {
  return useQuery<PaginatedDrawingResult>({
    queryKey: drawingKeys.list(params),
    queryFn: () => fetchDrawings(params),
  })
}

export type { Drawing, PaginatedDrawingResult }
