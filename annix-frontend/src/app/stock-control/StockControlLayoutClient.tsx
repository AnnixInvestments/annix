"use client";

import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";
import { PwaProvider } from "./components/PwaProvider";
import { StockControlDynamicBranding } from "./components/StockControlDynamicBranding";

export default function StockControlLayoutClient(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <StockControlAuthProvider>
      <StockControlDynamicBranding />
      <PwaProvider>{children}</PwaProvider>
    </StockControlAuthProvider>
  );
}
