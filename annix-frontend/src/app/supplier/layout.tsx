'use client';

import { SupplierAuthProvider } from '@/app/context/SupplierAuthContext';

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupplierAuthProvider>
      {children}
    </SupplierAuthProvider>
  );
}
