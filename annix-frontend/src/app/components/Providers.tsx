"use client";

import { QueryProvider } from "@/app/lib/query/QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
