"use client";

import { QueryProvider } from "@/app/lib/query/QueryProvider";
import { ExtractionProgressProvider } from "./ExtractionProgressModal";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toast";

export function Providers(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          <ExtractionProgressProvider>{children}</ExtractionProgressProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
