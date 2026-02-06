import { useQuery } from '@tanstack/react-query'
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config'
import { rfqKeys, type RfqQueryParams } from '../../keys'

interface Rfq {
  id: number
  rfqNumber: string
  projectName: string
  description?: string
  customerName?: string
  status: string
  totalWeightKg?: number
  totalCost?: number
  itemCount: number
  createdAt: string
  updatedAt: string
}

async function fetchRfqs(): Promise<Rfq[]> {
  const response = await fetch(`${browserBaseUrl()}/rfq`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch RFQs (${response.status}: ${body || response.statusText})`)
  }

  return response.json()
}

export function useRfqs(params?: RfqQueryParams) {
  return useQuery<Rfq[]>({
    queryKey: rfqKeys.list(params),
    queryFn: fetchRfqs,
  })
}

export type { Rfq }
