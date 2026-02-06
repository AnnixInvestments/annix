'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/context/AdminAuthContext';
import { LayoutProvider } from '@/app/context/LayoutContext';
import PortalToolbar from '@/app/components/PortalToolbar';
import { useFeatureFlags } from '@/app/hooks/useFeatureFlags';

const navItems = [
  {
    href: '/admin/portal/dashboard',
    label: 'Admin Portal',
    sublabel: 'Dashboard',
    icon: 'M7.5 14.25V16.5M10.5 12V16.5M13.5 9.75V16.5M16.5 7.5V16.5M6 20.25H18C19.2426 20.25 20.25 19.2426 20.25 18V6C20.25 4.75736 19.2426 3.75 18 3.75H6C4.75736 3.75 3.75 4.75736 3.75 6V18C3.75 19.2426 4.75736 20.25 6 20.25Z',
    roles: ['admin', 'employee']
  },
  {
    href: '/admin/portal/customers',
    label: 'Customers',
    icon: 'M17.9999 18.7191C18.2474 18.7396 18.4978 18.75 18.7506 18.75C19.7989 18.75 20.8054 18.5708 21.741 18.2413C21.7473 18.1617 21.7506 18.0812 21.7506 18C21.7506 16.3431 20.4074 15 18.7506 15C18.123 15 17.5403 15.1927 17.0587 15.5222M17.9999 18.7191C18 18.7294 18 18.7397 18 18.75C18 18.975 17.9876 19.1971 17.9635 19.4156C16.2067 20.4237 14.1707 21 12 21C9.82933 21 7.79327 20.4237 6.03651 19.4156C6.01238 19.1971 6 18.975 6 18.75C6 18.7397 6.00003 18.7295 6.00008 18.7192M17.9999 18.7191C17.994 17.5426 17.6494 16.4461 17.0587 15.5222M17.0587 15.5222C15.9928 13.8552 14.1255 12.75 12 12.75C9.87479 12.75 8.00765 13.8549 6.94169 15.5216M6.94169 15.5216C6.46023 15.1925 5.87796 15 5.25073 15C3.59388 15 2.25073 16.3431 2.25073 18C2.25073 18.0812 2.25396 18.1617 2.26029 18.2413C3.19593 18.5708 4.2024 18.75 5.25073 18.75C5.50307 18.75 5.75299 18.7396 6.00008 18.7192M6.94169 15.5216C6.35071 16.4457 6.00598 17.5424 6.00008 18.7192M15 6.75C15 8.40685 13.6569 9.75 12 9.75C10.3431 9.75 9 8.40685 9 6.75C9 5.09315 10.3431 3.75 12 3.75C13.6569 3.75 15 5.09315 15 6.75ZM21 9.75C21 10.9926 19.9926 12 18.75 12C17.5074 12 16.5 10.9926 16.5 9.75C16.5 8.50736 17.5074 7.5 18.75 7.5C19.9926 7.5 21 8.50736 21 9.75ZM7.5 9.75C7.5 10.9926 6.49264 12 5.25 12C4.00736 12 3 10.9926 3 9.75C3 8.50736 4.00736 7.5 5.25 7.5C6.49264 7.5 7.5 8.50736 7.5 9.75Z',
    roles: ['admin', 'employee']
  },
  {
    href: '/admin/portal/suppliers',
    label: 'Suppliers',
    icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125v-3.375m11.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 1.362 1.362 0 00-1.096-.478H14.25m-6 0V6.615c0-.568-.422-1.048-.986-1.106A49.027 49.027 0 008.25 5.25a49.026 49.026 0 00-5.013.26c-.565.057-.987.538-.987 1.106v7.635m12-4.501v4.501m0 0H2.25m12 0v4.5',
    roles: ['admin', 'employee']
  },
  {
    href: '/admin/portal/rfqs',
    label: 'RFQs',
    icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
    roles: ['admin', 'employee']
  },
  {
    href: '/admin/portal/messages',
    label: 'Messages',
    icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-6.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-6.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
    roles: ['admin', 'employee']
  },
  {
    href: '/admin/portal/users',
    label: 'Admin Users',
    icon: 'M9 12.7498L11.25 14.9998L15 9.74985M12 2.71411C9.8495 4.75073 6.94563 5.99986 3.75 5.99986C3.69922 5.99986 3.64852 5.99955 3.59789 5.99892C3.2099 7.17903 3 8.43995 3 9.74991C3 15.3414 6.82432 20.0397 12 21.3719C17.1757 20.0397 21 15.3414 21 9.74991C21 8.43995 20.7901 7.17903 20.4021 5.99892C20.3515 5.99955 20.3008 5.99986 20.25 5.99986C17.0544 5.99986 14.1505 4.75073 12 2.71411Z',
    roles: ['admin']
  },
  {
    href: '/admin/portal/secure-documents',
    label: 'Secure Docs',
    icon: 'M16.5 10.5V6.75C16.5 4.26472 14.4853 2.25 12 2.25C9.51472 2.25 7.5 4.26472 7.5 6.75V10.5M6.75 21.75H17.25C18.4926 21.75 19.5 20.7426 19.5 19.5V12.75C19.5 11.5074 18.4926 10.5 17.25 10.5H6.75C5.50736 10.5 4.5 11.5074 4.5 12.75V19.5C4.5 20.7426 5.50736 21.75 6.75 21.75Z',
    roles: ['admin']
  },
  {
    href: '/admin/portal/rubber',
    label: 'Rubber Lining',
    icon: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z',
    roles: ['admin', 'employee'],
    featureFlag: 'RUBBER_PORTAL',
  },
  {
    href: '/admin/portal/pumps',
    label: 'Pumps',
    icon: 'M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 007.92 12.446A9 9 0 1112 3zm0 0a9 9 0 109 9M12 3v9m0 0l6.364-6.364M12 12l-6.364-6.364',
    roles: ['admin', 'employee'],
  },
];

function AdminNavigation() {
  const router = useRouter();
  const { admin, logout } = useAdminAuth();
  const { flags } = useFeatureFlags();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <PortalToolbar
      portalType="admin"
      navItems={navItems}
      user={admin ? {
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        roles: admin.roles,
      } : null}
      onLogout={handleLogout}
      featureFlags={flags}
    />
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <AdminNavigation />
      <main className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
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
    <LayoutProvider>
      <LayoutContent>{children}</LayoutContent>
    </LayoutProvider>
  );
}

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
