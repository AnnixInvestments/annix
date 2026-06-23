"use client";

import type { ReactNode } from "react";
import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";
import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";

export default function CoreLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <StockControlAuthProvider>
      <AuRubberAuthProvider>{children}</AuRubberAuthProvider>
    </StockControlAuthProvider>
  );
}
