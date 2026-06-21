import { useQuery } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";
import { auIndustriesKeys } from "../../keys";

export interface AuIndustriesLinkedInPost {
  id: string;
  text: string;
  imageUrl: string | null;
  permalink: string;
  publishedAtISO: string;
}

async function fetchLinkedInFeed(): Promise<AuIndustriesLinkedInPost[]> {
  const response = await fetch(`${browserBaseUrl()}/public/au-industries/linkedin-feed`);
  if (!response.ok) {
    throw new Error("Failed to load LinkedIn feed");
  }
  return response.json();
}

export function useAuIndustriesLinkedInFeed() {
  return useQuery({
    queryKey: auIndustriesKeys.linkedInFeed(),
    queryFn: fetchLinkedInFeed,
    retry: false,
    staleTime: 1000 * 60 * 30,
    initialData: [] as AuIndustriesLinkedInPost[],
  });
}
