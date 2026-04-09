"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavPage {
  slug: string;
  title: string;
  isHomePage: boolean;
}

export function AuIndustriesNav(props: { pages: NavPage[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (slug: string) => {
    return pathname === `/au-industries/${slug}` || (slug === "" && pathname === "/au-industries");
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/au-industries" className="flex items-center space-x-3">
            <span className="text-xl font-bold text-white">AU Industries</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {props.pages.map((page) => {
              const href = page.isHomePage ? "/au-industries" : `/au-industries/${page.slug}`;
              const active = page.isHomePage ? pathname === "/au-industries" : isActive(page.slug);
              return (
                <Link
                  key={page.slug}
                  href={href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-red-700 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {page.title}
                </Link>
              );
            })}
            <Link
              href="/au-industries/contact"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/au-industries/contact"
                  ? "bg-red-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              Contact
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-300 hover:text-white p-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {props.pages.map((page) => {
              const href = page.isHomePage ? "/au-industries" : `/au-industries/${page.slug}`;
              const active = page.isHomePage ? pathname === "/au-industries" : isActive(page.slug);
              return (
                <Link
                  key={page.slug}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    active
                      ? "bg-red-700 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {page.title}
                </Link>
              );
            })}
            <Link
              href="/au-industries/contact"
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === "/au-industries/contact"
                  ? "bg-red-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              Contact
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
