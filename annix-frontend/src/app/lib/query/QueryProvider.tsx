"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

export function QueryProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const client = queryClient();

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
