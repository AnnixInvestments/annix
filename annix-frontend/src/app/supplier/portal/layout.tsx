'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupplierAuth } from '@/app/context/SupplierAuthContext';
import PortalToolbar from '@/app/components/PortalToolbar';
import RemoteAccessNotificationBanner from '@/app/components/remote-access/RemoteAccessNotificationBanner';
import { corpId } from '@/app/lib/corpId';

const navItems = [
  { href: '/supplier/portal/dashboard', label: 'Supplier Portal', sublabel: 'Dashboard', icon: 'M7.5 14.25V16.5M10.5 12V16.5M13.5 9.75V16.5M16.5 7.5V16.5M6 20.25H18C19.2426 20.25 20.25 19.2426 20.25 18V6C20.25 4.75736 19.2426 3.75 18 3.75H6C4.75736 3.75 3.75 4.75736 3.75 6V18C3.75 19.2426 4.75736 20.25 6 20.25Z' },
  { href: '/supplier/portal/boqs', label: 'BOQ Requests', icon: 'M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h6.364a2.25 2.25 0 012.013 1.244l.256.512a2.25 2.25 0 002.013 1.244h2.21a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h6.362M9 3.75V6a2.25 2.25 0 002.25 2.25h1.5A2.25 2.25 0 0015 6V3.75m-6 0h6' },
  { href: '/supplier/portal/onboarding', label: 'Onboarding', icon: 'M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.251 2.251 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75' },
  { href: '/supplier/portal/documents', label: 'Documents', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { href: '/supplier/portal/company', label: 'Company', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
  { href: '/supplier/portal/profile', label: 'Profile', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
];

export default function SupplierPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, supplier, logout } = useSupplierAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/supplier/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const statusBadge = supplier?.onboardingStatus ? (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        supplier.onboardingStatus === 'approved'
          ? 'bg-green-100 text-green-800'
          : supplier.onboardingStatus === 'rejected'
          ? 'bg-red-100 text-red-800'
          : supplier.onboardingStatus === 'submitted' ||
            supplier.onboardingStatus === 'under_review'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100 text-gray-800'
      }`}
    >
      {supplier.onboardingStatus.replace(/_/g, ' ').toUpperCase()}
    </span>
  ) : null;

  const additionalActions = (
    <Link
      href="/supplier/portal/boqs"
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
      style={{
        backgroundColor: corpId.colors.accent.orange,
        color: corpId.colors.text.onOrange,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = corpId.colors.accent.orangeLight;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = corpId.colors.accent.orange;
      }}
    >
      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      BOQ
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
      <PortalToolbar
        portalType="supplier"
        navItems={navItems}
        user={supplier ? {
          firstName: supplier.firstName,
          lastName: supplier.lastName,
          email: supplier.email,
          companyName: supplier.companyName,
        } : null}
        onLogout={handleLogout}
        statusBadge={statusBadge}
        additionalActions={additionalActions}
      />
      <RemoteAccessNotificationBanner />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
