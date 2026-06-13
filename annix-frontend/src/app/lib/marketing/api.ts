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
  // Arrays are replaced wholesale by saved content (see the customizer above), so
  // resources saved before ctaUrl existed lose their CTA on merge — which leaves
  // the pre-launch creative images unclickable. Backfill ctaUrl/ctaLabel from the
  // matching default resource by slug, same as the imageUrl backfills above.
  merged.resources.items.forEach((item) => {
    if (item.ctaUrl) {
      return;
    }
    const def = defaults.resources.items.find((entry) => entry.slug === item.slug);
    if (def?.ctaUrl) {
      item.ctaUrl = def.ctaUrl;
      item.ctaLabel = item.ctaLabel ? item.ctaLabel : def.ctaLabel;
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

export type SocialPlatform = "linkedin" | "facebook" | "instagram" | "x";

export interface SocialPlatformStatus {
  platform: SocialPlatform;
  label: string;
  configured: boolean;
}

export interface SocialShareResult {
  platform: SocialPlatform;
  ok: boolean;
  message: string;
}

export interface SocialSharePayload {
  platforms: SocialPlatform[];
  caption: string;
  imageUrl: string;
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

export interface CookieConsentLogPayload {
  consentId: string;
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export async function logCookieConsent(payload: CookieConsentLogPayload): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/public/marketing/cookie-consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Consent is already stored client-side; server logging is best-effort.
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

  socialStatus(): Promise<SocialPlatformStatus[]> {
    return adminClient.get<SocialPlatformStatus[]>("/admin/marketing/social/status");
  }

  shareToSocials(payload: SocialSharePayload): Promise<SocialShareResult[]> {
    return adminClient.post<SocialShareResult[]>("/admin/marketing/social/share", payload);
  }
}

export const marketingAdminApi = new MarketingAdminApiClient();
