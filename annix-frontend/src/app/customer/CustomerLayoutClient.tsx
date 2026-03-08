"use client";

import { CustomerAuthProvider } from "@/app/context/CustomerAuthContext";

export default function CustomerLayoutClient(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <CustomerAuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {children}
      </div>
    </CustomerAuthProvider>
  );
}
