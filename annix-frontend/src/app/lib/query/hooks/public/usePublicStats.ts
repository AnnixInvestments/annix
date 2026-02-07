import { useQuery } from '@tanstack/react-query'
import { browserBaseUrl } from '@/lib/api-config'
import { publicKeys } from '../../keys'

interface UpcomingRfq {
  id: number
  rfqNumber: string
  projectName: string
  requiredDate: string
  daysRemaining: number
  status: string
}

interface PublicStats {
  totalRfqs: number
  totalSuppliers: number
  totalCustomers: number
  upcomingRfqs: UpcomingRfq[]
}

async function fetchPublicStats(): Promise<PublicStats> {
  const response = await fetch(`${browserBaseUrl()}/public/stats`)

  if (!response.ok) {
    throw new Error('Failed to fetch stats')
  }

  return response.json()
}

export function usePublicStats() {
  return useQuery<PublicStats>({
    queryKey: publicKeys.stats(),
    queryFn: fetchPublicStats,
    retry: false,
    placeholderData: {
      totalRfqs: 0,
      totalSuppliers: 0,
      totalCustomers: 0,
      upcomingRfqs: [],
    },
  })
}

export type { PublicStats, UpcomingRfq }
