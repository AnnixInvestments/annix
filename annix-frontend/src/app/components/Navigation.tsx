'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import AmixLogo from './AmixLogo'
import { ThemeToggle } from './ThemeToggle'

const isPortalRoute = (pathname: string): boolean => {
  return pathname.startsWith('/customer/portal') ||
         pathname.startsWith('/supplier/portal') ||
         pathname.startsWith('/admin/portal');
};

export default function Navigation() {
  const pathname = usePathname();

  if (isPortalRoute(pathname)) {
    return null;
  }

  return (
    <nav
      className="sticky top-0 z-50 shadow-lg amix-toolbar"
      style={{ backgroundColor: '#001F3F' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <AmixLogo size="sm" showText useSignatureFont />
            </Link>

            <div className="flex gap-1">
              <Link
                href="/"
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  pathname === '/' ? 'bg-[#FFA500]' : 'hover:bg-[#003366]'
                }`}
                style={{ color: pathname === '/' ? '#001F3F' : '#FFA500' }}
              >
                Home
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
