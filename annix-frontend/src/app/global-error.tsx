"use client";

import { useEffect } from "react";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

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
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "32rem", padding: "1rem" }}>
            <div
              style={{
                color: "#ef4444",
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Something went wrong
            </div>
            <p style={{ color: "#4b5563", marginBottom: "0.5rem" }}>{error.message}</p>
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
                Back to Home
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
                Try Again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
