'use client';

import { useEffect } from 'react';
import { CustomerAuthProvider } from '@/app/context/CustomerAuthContext';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = 'Annix Customer';
  }, []);

  return <CustomerAuthProvider>{children}</CustomerAuthProvider>;
}
