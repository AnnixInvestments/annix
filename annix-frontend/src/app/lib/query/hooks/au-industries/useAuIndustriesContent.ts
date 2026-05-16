import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { browserBaseUrl } from "@/lib/api-config";
import { auIndustriesKeys } from "../../keys";

export interface AuIndustriesPage {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  content: string;
  heroImageUrl: string | null;
}

export interface AuIndustriesNavPage {
  slug: string;
  title: string;
  isHomePage: boolean;
  showInNav?: boolean;
}

async function fetchNavPages(): Promise<AuIndustriesNavPage[]> {
  const response = await fetch(`${browserBaseUrl()}/public/au-industries/pages`);
  if (!response.ok) {
    throw new Error("Failed to load pages");
  }
  return response.json();
}

async function fetchPage(slug: string): Promise<AuIndustriesPage> {
  const response = await fetch(`${browserBaseUrl()}/public/au-industries/pages/${slug}`);
  if (!response.ok) {
    throw new Error("Page not found");
  }
  return response.json();
}

export function useAuIndustriesNavPages() {
  return useQuery({
    queryKey: auIndustriesKeys.navPages(),
    queryFn: fetchNavPages,
    retry: false,
    initialData: [] as AuIndustriesNavPage[],
  });
}

export function useAuIndustriesPage(slug: string) {
  return useQuery({
    queryKey: auIndustriesKeys.page(slug),
    queryFn: () => fetchPage(slug),
    enabled: !!slug,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useUpdateAuIndustriesPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: string; content: string }) =>
      auRubberApiClient.updateWebsitePage(variables.id, { content: variables.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auIndustriesKeys.all });
    },
  });
}
