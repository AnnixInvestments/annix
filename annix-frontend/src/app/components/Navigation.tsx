'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AmixLogo from './AmixLogo';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Create RFQ', path: '/rfq', exact: true },
    { label: 'View RFQs', path: '/rfq/list', exact: false },
    { label: 'Drawings', path: '/drawings', exact: false },
    { label: 'BOQ', path: '/boq', exact: false },
    { label: 'Workflow', path: '/workflow', exact: false },
    { label: 'Reviews', path: '/reviews', exact: false },
  ];

  const isActive = (item: { path: string; exact: boolean }) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  };

  return (
    <nav
      className="sticky top-0 z-50 shadow-lg amix-toolbar"
      style={{ backgroundColor: '#001F3F' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            {/* Amix Logo */}
            <Link
              href="/"
              className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <AmixLogo size="sm" showText useSignatureFont />
            </Link>

            {/* Navigation Items */}
            <div className="flex gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    isActive(item)
                      ? 'bg-[#FFA500]'
                      : 'hover:bg-[#003366]'
                  }`}
                  style={{
                    color: isActive(item) ? '#FFFFFF' : '#FFA500'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - can add user menu, etc. */}
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium"
              style={{ color: '#FFA500', opacity: 0.8 }}
            >
              RFQ System
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
