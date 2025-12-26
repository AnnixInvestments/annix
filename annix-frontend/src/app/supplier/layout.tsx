'use client';

import { useEffect } from 'react';
import { SupplierAuthProvider } from '@/app/context/SupplierAuthContext';

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = 'Annix Supplier';
  }, []);

  return (
    <SupplierAuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {children}
      </div>
    </SupplierAuthProvider>
  );
}
