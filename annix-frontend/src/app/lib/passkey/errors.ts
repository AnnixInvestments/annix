export class PasskeyError extends Error {
  constructor(
    message: string,
    readonly code: PasskeyErrorCode,
  ) {
    super(message);
    this.name = "PasskeyError";
  }
}

export type PasskeyErrorCode =
  | "unsupported"
  | "cancelled"
  | "no-credential"
  | "rate-limited"
  | "server"
  | "network"
  | "unknown";

export function classifyPasskeyError(error: unknown): PasskeyError {
  if (error instanceof PasskeyError) return error;

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return new PasskeyError("Passkey prompt was cancelled or timed out", "cancelled");
    }
    if (error.name === "InvalidStateError") {
      return new PasskeyError(
        "This passkey is already registered for your account",
        "no-credential",
      );
    }
    if (error.name === "NotSupportedError") {
      return new PasskeyError("This device does not support passkeys", "unsupported");
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("rate")) {
      return new PasskeyError("Too many attempts — please wait a minute", "rate-limited");
    }
    if (error.message.toLowerCase().includes("fetch")) {
      return new PasskeyError("Network error — check your connection", "network");
    }
    return new PasskeyError(error.message, "server");
  }

  return new PasskeyError("An unknown error occurred", "unknown");
}

export function isPasskeySupported(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return false;
  return Boolean(window.PublicKeyCredential);
}
