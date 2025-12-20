'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Create RFQ', path: '/rfq', exact: true },
    { label: 'View RFQs', path: '/rfq/list', exact: false },
    { label: 'Drawings', path: '/drawings', exact: false },
    { label: 'BOQ', path: '/boq', exact: false },
    { label: 'Reviews', path: '/reviews', exact: false },
  ];

  const isActive = (item: { path: string; exact: boolean }) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Annix RFQ
              </h1>
            </div>
            <div className="flex gap-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    isActive(item)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
