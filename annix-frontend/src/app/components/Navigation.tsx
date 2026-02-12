'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Annix RFQ
              </h1>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Create RFQ
              </button>
              <button
                onClick={() => router.push('/rfqs')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  pathname.startsWith('/rfqs')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                View RFQs
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
