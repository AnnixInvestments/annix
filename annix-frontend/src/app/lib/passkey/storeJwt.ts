import type { PortalTokenStore } from "@/app/lib/api/portalTokenStore";
import type { PasskeyLoginResponse } from "./types";

export function storePasskeyJwt(
  store: PortalTokenStore,
  response: PasskeyLoginResponse,
  rememberMe: boolean,
): void {
  store.setTokens(response.access_token, response.refresh_token, rememberMe);
}

export function redirectAfterPasskeyLogin(target: string): void {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return;
  window.location.assign(target);
}
