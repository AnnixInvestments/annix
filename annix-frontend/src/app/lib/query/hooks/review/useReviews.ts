import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config'
import { reviewKeys, type ReviewQueryParams } from '../../keys'

interface ReviewWorkflow {
  id: number
  entityType: 'drawing' | 'boq'
  entityId: number
  workflowType: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  fromStatus: string
  toStatus: string
  assignedReviewerId?: number
  assignedReviewer?: {
    id: number
    username: string
  }
  initiatedBy: {
    id: number
    username: string
  }
  completedBy?: {
    id: number
    username: string
  }
  comments?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  drawing?: {
    id: number
    drawingNumber: string
    title: string
    status: string
  }
  boq?: {
    id: number
    boqNumber: string
    title: string
    status: string
  }
}

interface PaginatedReviewResult {
  data: ReviewWorkflow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function fetchReviews(
  tab: 'pending' | 'history',
  params?: ReviewQueryParams,
): Promise<PaginatedReviewResult> {
  const searchParams = new URLSearchParams()
  searchParams.set('page', (params?.page ?? 1).toString())
  searchParams.set('limit', (params?.limit ?? 20).toString())
  if (params?.entityType && params.entityType !== 'all') {
    searchParams.set('entityType', params.entityType)
  }

  const endpoint =
    tab === 'pending' ? '/workflow/pending' : '/workflow/history'
  const response = await fetch(
    `${browserBaseUrl()}${endpoint}?${searchParams.toString()}`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to fetch reviews (${response.status}: ${body || response.statusText})`,
    )
  }

  return response.json()
}

export function useReviews(
  tab: 'pending' | 'history',
  params?: ReviewQueryParams,
) {
  const queryKey =
    tab === 'pending'
      ? reviewKeys.pending(params)
      : reviewKeys.history(params)

  return useQuery<PaginatedReviewResult>({
    queryKey,
    queryFn: () => fetchReviews(tab, params),
  })
}

export function useReviewAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      action,
      comments,
    }: {
      entityType: string
      entityId: number
      action: 'approve' | 'reject' | 'request-changes'
      comments?: string
    }) => {
      const endpoint =
        entityType === 'drawing'
          ? `/drawings/${entityId}/${action}`
          : `/boq/${entityId}/${action}`

      const response = await fetch(`${browserBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ comments }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || `Failed to ${action}`)
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    },
  })
}

export type { ReviewWorkflow, PaginatedReviewResult }
