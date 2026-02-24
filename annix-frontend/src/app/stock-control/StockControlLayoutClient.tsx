"use client";

import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";
import { PwaProvider } from "./components/PwaProvider";

export default function StockControlLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <StockControlAuthProvider>
      <PwaProvider>{children}</PwaProvider>
    </StockControlAuthProvider>
  );
}
