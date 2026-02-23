"use client";

import { SupplierAuthProvider } from "@/app/context/SupplierAuthContext";

export default function SupplierLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SupplierAuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {children}
      </div>
    </SupplierAuthProvider>
  );
}
