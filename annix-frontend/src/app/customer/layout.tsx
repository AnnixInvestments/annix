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

  return (
    <CustomerAuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {children}
      </div>
    </CustomerAuthProvider>
  );
}
