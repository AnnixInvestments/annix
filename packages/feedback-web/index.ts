import {
  createFeedbackClient,
  type FeedbackAuthConfig,
  type FeedbackAuthContext,
  type FeedbackHostContext,
  type FeedbackStatusResponse,
  type FeedbackSubmitterOverride,
  feedbackResolutionLabel,
  feedbackStatusLabel,
} from "@annix/feedback-sdk";

export interface FeedbackWebWidgetOptions {
  apiBaseUrl: string;
  authContext: FeedbackAuthContext;
  resolveAuth: (authContext: FeedbackAuthContext) => FeedbackAuthConfig;
  target?: HTMLElement;
  title?: string;
  submitterOverride?: FeedbackSubmitterOverride | null;
  hostContext?: Omit<FeedbackHostContext, "authContext" | "submitterOverride">;
  captureScreenshot?: () => Promise<File | Blob | null>;
}

export interface FeedbackWebWidgetHandle {
  destroy(): void;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  properties: Partial<HTMLElementTagNameMap[K]>,
  style?: Partial<CSSStyleDeclaration>,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.assign(element, properties);
  if (style) {
    Object.assign(element.style, style);
  }
  return element;
}

function toFile(blob: Blob, name: string): File {
  if (blob instanceof File) {
    return blob;
  }
  return new File([blob], name, { type: blob.type || "application/octet-stream" });
}

function renderStatus(status: FeedbackStatusResponse | null): string {
  if (!status) {
    return "";
  }

  const resolution = feedbackResolutionLabel(status.resolutionStatus);
  const parts = [`Status: ${feedbackStatusLabel(status.status)}`];
  if (resolution) {
    parts.push(resolution);
  }
  if (status.aiClassification) {
    parts.push(`Classification: ${status.aiClassification}`);
  }
  return parts.join(" · ");
}

export function mountFeedbackWidget(options: FeedbackWebWidgetOptions): FeedbackWebWidgetHandle {
  const client = createFeedbackClient({
    apiBaseUrl: options.apiBaseUrl,
    resolveAuth: options.resolveAuth,
  });

  const root = options.target ?? document.body;
  const container = createElement(
    "div",
    {},
    { position: "fixed", right: "16px", bottom: "16px", zIndex: "2147483647" },
  );
  const button = createElement(
    "button",
    { type: "button", textContent: options.title ?? "Feedback" },
    {
      background: "#2563eb",
      color: "#ffffff",
      border: "0",
      borderRadius: "999px",
      padding: "12px 16px",
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
    },
  );
  const panel = createElement(
    "div",
    {},
    {
      display: "none",
      width: "320px",
      background: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "16px",
      boxShadow: "0 24px 40px rgba(15, 23, 42, 0.18)",
      padding: "16px",
      marginBottom: "12px",
      fontFamily: "system-ui, sans-serif",
    },
  );
  const heading = createElement(
    "div",
    { textContent: options.title ?? "Send feedback" },
    { fontWeight: "600", marginBottom: "8px", color: "#111827" },
  );
  const textarea = createElement(
    "textarea",
    { placeholder: "Describe the problem or idea..." },
    {
      width: "100%",
      minHeight: "120px",
      border: "1px solid #d1d5db",
      borderRadius: "12px",
      padding: "12px",
      resize: "vertical",
      font: "inherit",
      boxSizing: "border-box",
    },
  );
  const fileInput = createElement(
    "input",
    { type: "file", multiple: true },
    { marginTop: "8px", display: "block" },
  );
  const statusLine = createElement(
    "div",
    { textContent: "" },
    { marginTop: "8px", color: "#4b5563", fontSize: "13px", minHeight: "18px" },
  );
  const errorLine = createElement(
    "div",
    { textContent: "" },
    { marginTop: "8px", color: "#b91c1c", fontSize: "13px", minHeight: "18px" },
  );
  const actions = createElement(
    "div",
    {},
    { display: "flex", justifyContent: "space-between", marginTop: "12px", gap: "8px" },
  );
  const closeButton = createElement(
    "button",
    { type: "button", textContent: "Close" },
    {
      border: "1px solid #d1d5db",
      borderRadius: "10px",
      background: "#ffffff",
      color: "#111827",
      padding: "10px 14px",
      cursor: "pointer",
      flex: "1",
    },
  );
  const submitButton = createElement(
    "button",
    { type: "button", textContent: "Send" },
    {
      border: "0",
      borderRadius: "10px",
      background: "#2563eb",
      color: "#ffffff",
      padding: "10px 14px",
      cursor: "pointer",
      flex: "1",
    },
  );

  let latestFeedbackId: number | null = null;
  let pollTimer: number | null = null;

  const stopPolling = () => {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const refreshStatus = async () => {
    if (latestFeedbackId === null) {
      return;
    }

    try {
      const status = await client.getFeedbackStatus({
        authContext: options.authContext,
        feedbackId: latestFeedbackId,
      });
      statusLine.textContent = renderStatus(status);
      if (status.status === "resolved") {
        stopPolling();
      }
    } catch (error) {
      errorLine.textContent =
        error instanceof Error ? error.message : "Unable to refresh feedback status";
    }
  };

  button.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    if (panel.style.display === "block" && latestFeedbackId !== null) {
      void refreshStatus();
    }
  });

  closeButton.addEventListener("click", () => {
    panel.style.display = "none";
  });

  submitButton.addEventListener("click", async () => {
    const content = textarea.value.trim();
    if (content.length < 10) {
      errorLine.textContent = "Feedback must be at least 10 characters.";
      return;
    }

    errorLine.textContent = "";
    statusLine.textContent = "Submitting...";
    submitButton.setAttribute("disabled", "true");

    try {
      const files = Array.from(fileInput.files ?? []);
      const screenshot = options.captureScreenshot ? await options.captureScreenshot() : null;
      if (screenshot) {
        files.unshift(toFile(screenshot, "auto-screenshot.png"));
      }

      const result = await client.submitFeedback({
        authContext: options.authContext,
        payload: {
          content,
          source: "text",
          pageUrl: options.hostContext?.pageUrl ?? window.location.pathname,
          captureUrl: options.hostContext?.captureUrl ?? window.location.href,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          userAgent: window.navigator.userAgent,
          previewUserId: options.submitterOverride?.userId,
          previewUserName: options.submitterOverride?.name,
          previewUserEmail: options.submitterOverride?.email,
          appContext: options.hostContext?.appContext ?? options.authContext,
        },
        files,
      });

      latestFeedbackId = result.id;
      textarea.value = "";
      fileInput.value = "";
      await refreshStatus();
      stopPolling();
      pollTimer = window.setInterval(() => {
        void refreshStatus();
      }, 10000);
    } catch (error) {
      errorLine.textContent = error instanceof Error ? error.message : "Failed to submit feedback";
      statusLine.textContent = "";
    } finally {
      submitButton.removeAttribute("disabled");
    }
  });

  actions.append(closeButton, submitButton);
  panel.append(heading, textarea, fileInput, statusLine, errorLine, actions);
  container.append(panel, button);
  root.appendChild(container);

  return {
    destroy() {
      stopPolling();
      container.remove();
    },
  };
}
