"use client";

import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";

export default function StockControlLayoutClient({ children }: { children: React.ReactNode }) {
  return <StockControlAuthProvider>{children}</StockControlAuthProvider>;
}
