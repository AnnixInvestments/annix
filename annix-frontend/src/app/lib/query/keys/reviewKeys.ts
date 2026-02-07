export interface ReviewQueryParams {
  entityType?: string
  page?: number
  limit?: number
}

export const reviewKeys = {
  all: ['review'] as const,
  pending: (params?: ReviewQueryParams) =>
    [...reviewKeys.all, 'pending', params ?? {}] as const,
  history: (params?: ReviewQueryParams) =>
    [...reviewKeys.all, 'history', params ?? {}] as const,
} as const
