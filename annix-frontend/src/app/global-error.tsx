"use client";

import { useEffect, useMemo } from "react";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  const supportCode = useMemo(() => buildSupportCode(error), [error]);
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundColor: "#f9fafb",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "32rem" }}>
            <div
              style={{
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "9999px",
                backgroundColor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                color: "#dc2626",
                fontSize: "1.75rem",
                fontWeight: 700,
              }}
            >
              !
            </div>
            <h1
              style={{
                color: "#111827",
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              We hit a snag.
            </h1>
            <p style={{ color: "#4b5563", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              The error was logged automatically. You can keep working — try the action again, or
              head back to the home page. If the problem keeps happening, share the support code
              below with the Annix team and we'll take a look.
            </p>
            <div
              style={{
                marginTop: "1.25rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ color: "#6b7280", textTransform: "uppercase", fontWeight: 500 }}>
                Support code
              </span>
              <code style={{ fontFamily: "ui-monospace, monospace", color: "#111827" }}>
                {supportCode}
              </code>
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                marginTop: "1.5rem",
              }}
            >
              <a
                href="/"
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#374151",
                  color: "#ffffff",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                Back to home
              </a>
              <button
                onClick={reset}
                type="button"
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "0.375rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                Try again
              </button>
            </div>
            {isDev && (
              <details style={{ marginTop: "2rem", textAlign: "left", color: "#6b7280" }}>
                <summary style={{ fontSize: "0.75rem", cursor: "pointer" }}>
                  Show technical details (dev only)
                </summary>
                <pre
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.75rem",
                    background: "#111827",
                    color: "#f3f4f6",
                    borderRadius: "0.375rem",
                    fontSize: "0.6875rem",
                    overflow: "auto",
                    maxHeight: "16rem",
                  }}
                >
                  {error.name}: {error.message}
                  {error.digest ? `\n\ndigest: ${error.digest}` : ""}
                  {error.stack ? `\n\n${error.stack}` : ""}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

function buildSupportCode(error: Error & { digest?: string }): string {
  const seed = error.digest ? error.digest : `${error.name}|${error.message}`;
  const hash = Array.from(seed).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  const left = hash.toString(16).toUpperCase().padStart(8, "0").slice(0, 4);
  const right = (hash ^ 0x9e3779b1).toString(16).toUpperCase().padStart(8, "0").slice(0, 4);
  return `ERR-${left}-${right}`;
}
