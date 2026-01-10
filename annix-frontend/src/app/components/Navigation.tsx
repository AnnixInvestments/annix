'use client'

import React from 'react'
import Link from 'next/link'
import AmixLogo from './AmixLogo'
import { ThemeToggle } from './ThemeToggle'

export default function Navigation() {
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

            <div className="flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap hover:bg-[#003366] text-[#FFA500]"
              >
                Home
              </Link>
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap hover:bg-[#003366] text-[#FFA500]"
              >
                Pricing
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
