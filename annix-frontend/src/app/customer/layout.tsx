'use client';

import { CustomerAuthProvider } from '@/app/context/CustomerAuthContext';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>;
}
