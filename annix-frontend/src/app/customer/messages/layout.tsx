'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/app/context/CustomerAuthContext';
import PortalToolbar from '@/app/components/PortalToolbar';
import RemoteAccessNotificationBanner from '@/app/components/remote-access/RemoteAccessNotificationBanner';

const navItems = [
  { href: '/customer/portal/dashboard', label: 'Customer Portal', sublabel: 'Dashboard', icon: 'M7.5 14.25V16.5M10.5 12V16.5M13.5 9.75V16.5M16.5 7.5V16.5M6 20.25H18C19.2426 20.25 20.25 19.2426 20.25 18V6C20.25 4.75736 19.2426 3.75 18 3.75H6C4.75736 3.75 3.75 4.75736 3.75 6V18C3.75 19.2426 4.75736 20.25 6 20.25Z' },
  { href: '/customer/messages', label: 'Messages', icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-6.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-6.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155' },
  { href: '/customer/portal/suppliers', label: 'Suppliers', icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125v-3.375m11.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 1.362 1.362 0 00-1.096-.478H14.25m-6 0V6.615c0-.568-.422-1.048-.986-1.106A49.027 49.027 0 008.25 5.25a49.026 49.026 0 00-5.013.26c-.565.057-.987.538-.987 1.106v7.635m12-4.501v4.501m0 0H2.25m12 0v4.5' },
  { href: '/customer/portal/rfqs', label: 'My RFQs', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' },
  { href: '/customer/portal/rfqs/create', label: 'New RFQ', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
];

function CustomerNavigation() {
  const router = useRouter();
  const { customer, logout } = useCustomerAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <PortalToolbar
      portalType="customer"
      navItems={navItems}
      user={customer ? {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        companyName: customer.companyName,
      } : null}
      onLogout={handleLogout}
    />
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCustomerAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/customer/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <CustomerNavigation />
      <RemoteAccessNotificationBanner />
      <main className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function CustomerMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
