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
      style={{ backgroundColor: '#323288' }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
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
                  pathname === '/' ? 'bg-[#FFA500]' : 'hover:bg-[#4a4da3]'
                }`}
                style={{ color: pathname === '/' ? '#323288' : '#FFA500' }}
              >
                Home
              </Link>
              <Link
                href="/rfq"
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  pathname === '/rfq' || pathname.startsWith('/rfq/') ? 'bg-[#FFA500]' : 'hover:bg-[#4a4da3]'
                }`}
                style={{ color: pathname === '/rfq' || pathname.startsWith('/rfq/') ? '#323288' : '#FFA500' }}
              >
                Create an RFQ
              </Link>
              <Link
                href="/pricing"
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  pathname === '/pricing' ? 'bg-[#FFA500]' : 'hover:bg-[#4a4da3]'
                }`}
                style={{ color: pathname === '/pricing' ? '#323288' : '#FFA500' }}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  pathname === '/about' ? 'bg-[#FFA500]' : 'hover:bg-[#4a4da3]'
                }`}
                style={{ color: pathname === '/about' ? '#323288' : '#FFA500' }}
              >
                About
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
