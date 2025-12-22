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
      {children}
    </SupplierAuthProvider>
  );
}
