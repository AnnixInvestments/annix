import { startRegistration } from "@simplewebauthn/browser";
import { authedFetch } from "@/app/lib/api/authedFetch";
import { browserBaseUrl } from "@/lib/api-config";
import { classifyPasskeyError, PasskeyError } from "./errors";
import type { PasskeySummary } from "./types";

export async function registerPasskey(
  deviceName: string | null,
  authHeaders?: Record<string, string>,
): Promise<PasskeySummary> {
  try {
    const optionsResponse = await authedFetch(`${browserBaseUrl()}/auth/passkey/register/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
    });

    if (!optionsResponse.ok) {
      throw new PasskeyError("Failed to start passkey registration", "server");
    }

    const creationOptions = await optionsResponse.json();

    const attestation = await startRegistration({ optionsJSON: creationOptions });

    const verifyResponse = await authedFetch(`${browserBaseUrl()}/auth/passkey/register/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        response: attestation,
        deviceName: deviceName?.trim() || undefined,
      }),
    });

    if (!verifyResponse.ok) {
      throw new PasskeyError("Passkey registration could not be verified", "server");
    }

    return (await verifyResponse.json()) as PasskeySummary;
  } catch (error) {
    throw classifyPasskeyError(error, "register");
  }
}
