import { startAuthentication } from "@simplewebauthn/browser";
import { browserBaseUrl } from "@/lib/api-config";
import { classifyPasskeyError, PasskeyError } from "./errors";
import type { PasskeyLoginResponse } from "./types";

export async function authenticateWithPasskey(
  email: string | null,
  options: { conditional?: boolean; appCode?: string } = {},
): Promise<PasskeyLoginResponse> {
  try {
    const optionsResponse = await fetch(`${browserBaseUrl()}/auth/passkey/login/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email ? { email } : {}),
    });

    if (optionsResponse.status === 429) {
      throw new PasskeyError("Too many attempts — please wait a minute", "rate-limited");
    }

    if (!optionsResponse.ok) {
      throw new PasskeyError("Failed to start passkey sign-in", "server");
    }

    const requestOptions = await optionsResponse.json();

    const assertion = await startAuthentication({
      optionsJSON: requestOptions,
      useBrowserAutofill: options.conditional === true,
    });

    const verifyBody: Record<string, unknown> = { response: assertion };
    if (options.appCode) verifyBody.appCode = options.appCode;

    const verifyResponse = await fetch(`${browserBaseUrl()}/auth/passkey/login/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyBody),
    });

    if (verifyResponse.status === 429) {
      throw new PasskeyError("Too many attempts — please wait a minute", "rate-limited");
    }

    if (!verifyResponse.ok) {
      throw new PasskeyError("Passkey sign-in failed", "server");
    }

    return (await verifyResponse.json()) as PasskeyLoginResponse;
  } catch (error) {
    throw classifyPasskeyError(error);
  }
}
