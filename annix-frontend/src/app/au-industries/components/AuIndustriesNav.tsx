"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useEditMode } from "../context/EditModeContext";

interface NavPage {
  slug: string;
  title: string;
  isHomePage: boolean;
}

export function AuIndustriesNav(props: { pages: NavPage[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { editMode, setEditMode, isAdmin } = useEditMode();

  const isActive = (slug: string) => {
    return pathname === `/${slug}`;
  };

  return (
    <nav className="bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <Link href="/" className="flex-shrink-0 rounded-xl overflow-hidden">
            <Image
              src="/au-industries/logo.jpg"
              alt="AU Industries"
              width={200}
              height={100}
              className="h-20 w-auto rounded-xl"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {props.pages.map((page) => {
              const href = page.isHomePage ? "/" : `/${page.slug}`;
              const active = page.isHomePage ? pathname === "/" : isActive(page.slug);
              const label = page.isHomePage ? "Home" : page.title;
              return (
                <Link
                  key={page.slug}
                  href={href}
                  className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-800 hover:text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/quote"
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                pathname === "/quote"
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-800 hover:text-gray-900"
              }`}
            >
              Quote
            </Link>
            <Link
              href="/contact"
              className={`ml-2 px-5 py-2 text-sm font-semibold uppercase tracking-wide border-2 border-gray-900 transition-colors ${
                pathname === "/contact"
                  ? "bg-gray-900 text-white"
                  : "text-gray-900 hover:bg-gray-900 hover:text-white"
              }`}
            >
              Contact Us
            </Link>
            {isAdmin && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`ml-4 px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors ${
                  editMode
                    ? "bg-[#B8860B] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={editMode ? "Exit edit mode" : "Edit this page"}
              >
                <svg
                  className="w-4 h-4 inline-block mr-1 -mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {editMode ? "Editing" : "Edit"}
              </button>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-900 hover:text-gray-700 p-2"
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
          <div className="md:hidden pb-4 space-y-1 border-t border-[#B8860B]/40 pt-2">
            {props.pages.map((page) => {
              const href = page.isHomePage ? "/" : `/${page.slug}`;
              const active = page.isHomePage ? pathname === "/" : isActive(page.slug);
              const label = page.isHomePage ? "Home" : page.title;
              return (
                <Link
                  key={page.slug}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 text-base font-semibold uppercase ${
                    active ? "text-gray-900" : "text-gray-800 hover:text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/quote"
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 text-base font-semibold uppercase ${
                pathname === "/quote" ? "text-gray-900" : "text-gray-800 hover:text-gray-900"
              }`}
            >
              Quote
            </Link>
            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 text-base font-semibold uppercase ${
                pathname === "/contact" ? "text-gray-900" : "text-gray-800 hover:text-gray-900"
              }`}
            >
              Contact Us
            </Link>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditMode(!editMode);
                  setMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-base font-semibold uppercase ${
                  editMode ? "text-gray-900" : "text-gray-800 hover:text-gray-900"
                }`}
              >
                {editMode ? "Exit Edit Mode" : "Edit Page"}
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
