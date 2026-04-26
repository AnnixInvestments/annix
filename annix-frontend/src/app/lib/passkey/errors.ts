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

export type PasskeyIntent = "login" | "register";

const LOGIN_NOT_ALLOWED_MESSAGE =
  "No passkey is registered for this account on this device. " +
  "Sign in with your password first, then register a passkey from your account settings.";

const REGISTER_NOT_ALLOWED_MESSAGE = "Passkey prompt was cancelled or timed out. Please try again.";

const RP_ID_MISMATCH_MESSAGE =
  "Passkey configuration mismatch on this hostname. Reload the page; if the problem persists, contact support.";

function underlyingDomExceptionName(error: Error): string | null {
  if (!("cause" in error)) return null;
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof DOMException) return cause.name;
  return null;
}

export function classifyPasskeyError(
  error: unknown,
  intent: PasskeyIntent = "login",
): PasskeyError {
  if (error instanceof PasskeyError) return error;

  const notAllowedMessage =
    intent === "login" ? LOGIN_NOT_ALLOWED_MESSAGE : REGISTER_NOT_ALLOWED_MESSAGE;
  const notAllowedCode: PasskeyErrorCode = intent === "login" ? "no-credential" : "cancelled";

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return new PasskeyError(notAllowedMessage, notAllowedCode);
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
    if (error.name === "SecurityError") {
      return new PasskeyError(RP_ID_MISMATCH_MESSAGE, "server");
    }
  }

  if (error instanceof Error) {
    const wrappedName = underlyingDomExceptionName(error);
    if (error.name === "NotAllowedError" || wrappedName === "NotAllowedError") {
      return new PasskeyError(notAllowedMessage, notAllowedCode);
    }
    if (wrappedName === "InvalidStateError") {
      return new PasskeyError(
        "This passkey is already registered for your account",
        "no-credential",
      );
    }
    if (wrappedName === "NotSupportedError") {
      return new PasskeyError("This device does not support passkeys", "unsupported");
    }
    if (error.name === "SecurityError" || wrappedName === "SecurityError") {
      return new PasskeyError(RP_ID_MISMATCH_MESSAGE, "server");
    }
    if (error.message.toLowerCase().includes("rp id")) {
      return new PasskeyError(RP_ID_MISMATCH_MESSAGE, "server");
    }
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
