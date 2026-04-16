"use client";

import { isString, isUndefined } from "es-toolkit/compat";

type Cleanup = () => void;

const MAX_CAPTURE_ITEMS = 10;

let refCount = 0;
let cleanupFns: Cleanup[] = [];
const lastUserActions: string[] = [];
const consoleErrors: string[] = [];
const failedNetworkCalls: string[] = [];
let clickedElement: string | null = null;

function pushLimited(target: string[], value: string): void {
  if (!value) {
    return;
  }
  target.push(value);
  if (target.length > MAX_CAPTURE_ITEMS) {
    target.splice(0, target.length - MAX_CAPTURE_ITEMS);
  }
}

function normalizeText(value: string | null | undefined, maxLength: number): string {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function describeElement(element: Element | null): string | null {
  if (!element) {
    return null;
  }

  const id = element.getAttribute("id");
  const className = normalizeText(element.getAttribute("class"), 80);
  const role = element.getAttribute("role");
  const name = element.getAttribute("name");
  const href = element.getAttribute("href");
  const text = normalizeText(element.textContent, 120);

  const parts = [element.tagName.toLowerCase()];
  if (id) parts.push(`#${id}`);
  if (className) parts.push(`.${className}`);
  if (role) parts.push(`role=${role}`);
  if (name) parts.push(`name=${name}`);
  if (href) parts.push(`href=${href}`);
  if (text) parts.push(`text=${text}`);
  return parts.join(" ");
}

function describeUrl(input: string): string {
  try {
    const url = new URL(input, window.location.href);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return normalizeText(input, 200);
  }
}

function installCapture(): void {
  const handleClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const description = describeElement(target);
    if (!description) {
      return;
    }
    clickedElement = description;
    pushLimited(lastUserActions, `click ${description}`);
  };

  const handleError = (event: ErrorEvent) => {
    const eventMessage = event.message;
    const errorMessage = event.error?.message;
    const sourceMessage = eventMessage ? eventMessage : errorMessage;
    const message = normalizeText(sourceMessage, 300);
    if (message) {
      pushLimited(consoleErrors, message);
    }
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    const rejectionReason = event.reason;
    const reason = isString(rejectionReason)
      ? rejectionReason
      : rejectionReason instanceof Error
        ? rejectionReason.message
        : JSON.stringify(rejectionReason);
    const message = normalizeText(reason, 300);
    if (message) {
      pushLimited(consoleErrors, message);
    }
  };

  const originalConsoleError = window.console.error.bind(window.console);
  window.console.error = (...args: unknown[]) => {
    const message = normalizeText(
      args
        .map((arg) => {
          if (isString(arg)) {
            return arg;
          }
          if (arg instanceof Error) {
            return arg.message;
          }
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(" "),
      300,
    );
    if (message) {
      pushLimited(consoleErrors, message);
    }
    originalConsoleError(...args);
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = isString(input)
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const initMethod = init?.method;
    const requestConstructor = globalThis.Request;
    const requestMethod =
      requestConstructor && input instanceof requestConstructor ? input.method : null;
    const method = initMethod ? initMethod : requestMethod ? requestMethod : "GET";

    try {
      const response = await originalFetch(input, init);
      if (!response.ok) {
        pushLimited(
          failedNetworkCalls,
          `${method.toUpperCase()} ${describeUrl(requestUrl)} -> ${response.status}`,
        );
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "network error";
      pushLimited(
        failedNetworkCalls,
        `${method.toUpperCase()} ${describeUrl(requestUrl)} -> ${normalizeText(message, 120)}`,
      );
      throw error;
    }
  };

  document.addEventListener("click", handleClick, true);
  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  cleanupFns = [
    () => document.removeEventListener("click", handleClick, true),
    () => window.removeEventListener("error", handleError),
    () => window.removeEventListener("unhandledrejection", handleRejection),
    () => {
      window.console.error = originalConsoleError;
    },
    () => {
      window.fetch = originalFetch;
    },
  ];
}

export function startFeedbackCapture(): void {
  if (isUndefined(globalThis.window)) {
    return;
  }
  refCount += 1;
  if (refCount === 1) {
    installCapture();
  }
}

export function stopFeedbackCapture(): void {
  if (isUndefined(globalThis.window)) {
    return;
  }
  refCount = Math.max(0, refCount - 1);
  if (refCount !== 0) {
    return;
  }
  for (const cleanup of cleanupFns) {
    cleanup();
  }
  cleanupFns = [];
}

export function getFeedbackCaptureSnapshot() {
  return {
    lastUserActions: [...lastUserActions],
    consoleErrors: [...consoleErrors],
    failedNetworkCalls: [...failedNetworkCalls],
    clickedElement,
  };
}
