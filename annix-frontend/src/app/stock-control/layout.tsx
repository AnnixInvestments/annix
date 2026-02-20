"use client";

import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";

export default function StockControlLayout({ children }: { children: React.ReactNode }) {
  return <StockControlAuthProvider>{children}</StockControlAuthProvider>;
}
