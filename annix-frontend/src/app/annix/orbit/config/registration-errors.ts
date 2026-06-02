import { isArray, isString } from "es-toolkit/compat";

export interface RegistrationErrorInfo {
  alreadyExists: boolean;
  message: string;
}

export function parseRegistrationError(err: unknown): RegistrationErrorInfo {
  const raw = err instanceof Error ? err.message : "";
  const alreadyExists = /HTTP 409/.test(raw) || /already (registered|exists|in use)/i.test(raw);
  const serverMessage = extractServerMessage(raw);
  const fallback = "Something went wrong while creating your account. Please try again.";
  const message = alreadyExists
    ? "An account with this email already exists. You can sign in instead, or go back and use a different email address."
    : serverMessage || fallback;
  return { alreadyExists, message };
}

function extractServerMessage(raw: string): string | null {
  const braceIndex = raw.indexOf("{");
  if (braceIndex === -1) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw.slice(braceIndex));
    const candidate = parsed?.message;
    if (isString(candidate)) {
      return candidate;
    }
    if (isArray(candidate) && isString(candidate[0])) {
      return candidate[0];
    }
    return null;
  } catch {
    return null;
  }
}
