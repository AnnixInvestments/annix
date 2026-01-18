'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupplierAuth } from '@/app/context/SupplierAuthContext';
import PortalToolbar from '@/app/components/PortalToolbar';
import { corpId } from '@/app/lib/corpId';

const navItems = [
  { href: '/supplier/portal/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/supplier/portal/boqs', label: 'BOQ Requests', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
  { href: '/supplier/portal/onboarding', label: 'Onboarding', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/supplier/portal/documents', label: 'Documents', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { href: '/supplier/portal/company', label: 'Company', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { href: '/supplier/portal/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
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
    router.push('/supplier/login');
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

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
