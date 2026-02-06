export interface RfqQueryParams {
  status?: string
}

export const rfqKeys = {
  all: ['rfq'] as const,
  list: (params?: RfqQueryParams) =>
    [...rfqKeys.all, 'list', params ?? {}] as const,
  detail: (id: number) =>
    [...rfqKeys.all, 'detail', id] as const,
  drafts: {
    all: ['rfq', 'drafts'] as const,
    list: () => ['rfq', 'drafts', 'list'] as const,
    detail: (id: number) => ['rfq', 'drafts', 'detail', id] as const,
  },
} as const
