import { nowISO } from "@/app/lib/datetime";

export const COOKIE_CONSENT_KEY = "annix_cookie_consent_v1";
export const COOKIE_CONSENT_EVENT = "annix-cookie-consent-changed";
export const COOKIE_SETTINGS_EVENT = "annix-cookie-settings-open";

export function openCookieSettings(): void {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
}

export type CookieCategory = "necessary" | "functional" | "analytics" | "marketing";

export interface CookieConsent {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentId: string;
  timestamp: string;
}

export interface CookieConsentChoices {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function readConsent(): CookieConsent | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

export function hasConsent(category: CookieCategory): boolean {
  const consent = readConsent();
  if (!consent) {
    return false;
  }
  return consent[category] === true;
}

function newConsentId(): string {
  const cryptoApi = window.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `consent-${nowISO()}`;
}

export function saveConsent(choices: CookieConsentChoices): CookieConsent {
  const existing = readConsent();
  const existingId = existing ? existing.consentId : "";
  const consentId = existingId ? existingId : newConsentId();
  const consent: CookieConsent = {
    necessary: true,
    functional: choices.functional,
    analytics: choices.analytics,
    marketing: choices.marketing,
    consentId,
    timestamp: nowISO(),
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
  return consent;
}
