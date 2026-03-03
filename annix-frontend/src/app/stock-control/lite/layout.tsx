"use client";

import { ReactNode } from "react";
import { LiteHeader } from "./components/LiteHeader";

interface LiteLayoutProps {
  children: ReactNode;
}

export default function LiteLayout({ children }: LiteLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <LiteHeader />
      <main className="p-4">{children}</main>
    </div>
  );
}
