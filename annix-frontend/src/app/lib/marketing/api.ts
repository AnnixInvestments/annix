import {
  defaultMarketingContent,
  type MarketingSiteContent,
  type MarketingSiteStatus,
} from "@annix/product-data/marketing";
import { isArray, isString, mergeWith } from "es-toolkit/compat";
import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL, ipv4LocalhostUrl } from "@/lib/api-config";

export function mergeMarketingDefaults(
  content: MarketingSiteContent | null | undefined,
): MarketingSiteContent {
  if (!content) {
    return defaultMarketingContent();
  }
  // mergeWith mutates its first arg, so keep a separate untouched copy for lookups.
  const defaults = defaultMarketingContent();
  const merged = mergeWith(defaultMarketingContent(), content, (_baseValue, value) =>
    isArray(value) ? value : undefined,
  ) as MarketingSiteContent;
  merged.industries.items.forEach((item) => {
    if (!item.imageUrl) {
      const def = defaults.industries.items.find((entry) => entry.slug === item.slug);
      if (def?.imageUrl) {
        item.imageUrl = def.imageUrl;
      }
    }
  });
  merged.ecosystem.products.forEach((product) => {
    if (!product.imageUrl) {
      const def = defaults.ecosystem.products.find(
        (entry) => entry.detailSlug === product.detailSlug,
      );
      if (def?.imageUrl) {
        product.imageUrl = def.imageUrl;
      }
    }
  });
  merged.partners.partners.forEach((partner) => {
    if (!isString(partner.url)) {
      partner.url = "";
    }
  });
  return merged;
}

export interface MarketingContactPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}

export async function fetchPublishedMarketingContent(): Promise<MarketingSiteContent> {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  const isServer = typeof window === "undefined";
  const base = isServer ? ipv4LocalhostUrl(API_BASE_URL) : API_BASE_URL;
  try {
    const res = await fetch(`${base}/public/marketing/content`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return defaultMarketingContent();
    }
    return mergeMarketingDefaults((await res.json()) as MarketingSiteContent);
  } catch {
    return defaultMarketingContent();
  }
}

export async function submitMarketingContact(payload: MarketingContactPayload): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/public/marketing/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && isString(body.error) ? body.error : "Something went wrong — please try again.";
    throw new Error(message);
  }
  return body && isString(body.message) ? body.message : "Thanks — your enquiry has been sent.";
}

const adminClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class MarketingAdminApiClient {
  draft(): Promise<MarketingSiteContent> {
    return adminClient.get<MarketingSiteContent>("/admin/marketing/content");
  }

  status(): Promise<MarketingSiteStatus> {
    return adminClient.get<MarketingSiteStatus>("/admin/marketing/status");
  }

  saveDraft(content: MarketingSiteContent): Promise<MarketingSiteContent> {
    return adminClient.put<MarketingSiteContent>("/admin/marketing/content", content);
  }

  publish(): Promise<MarketingSiteContent> {
    return adminClient.post<MarketingSiteContent>("/admin/marketing/publish");
  }

  discardDraft(): Promise<MarketingSiteContent> {
    return adminClient.post<MarketingSiteContent>("/admin/marketing/discard-draft");
  }

  uploadImage(file: File): Promise<{ url: string }> {
    return adminClient.uploadFile<{ url: string }>("/admin/marketing/upload-image", file);
  }
}

export const marketingAdminApi = new MarketingAdminApiClient();
