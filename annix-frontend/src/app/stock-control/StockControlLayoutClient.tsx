"use client";

import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";
import { PwaProvider } from "./components/PwaProvider";
import { StockControlDynamicBranding } from "./components/StockControlDynamicBranding";

export default function StockControlLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <StockControlAuthProvider>
      <StockControlDynamicBranding />
      <PwaProvider>{children}</PwaProvider>
    </StockControlAuthProvider>
  );
}
