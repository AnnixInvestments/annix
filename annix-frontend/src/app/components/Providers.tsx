"use client";

import { QueryProvider } from "@/app/lib/query/QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toast";

export function Providers(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
