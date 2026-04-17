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
    return pathname === `/au-industries/${slug}` || (slug === "" && pathname === "/au-industries");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 border-t-4 border-t-[#333]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <Link href="/au-industries" className="flex-shrink-0">
            <Image
              src="/au-industries/logo.jpg"
              alt="AU Industries"
              width={200}
              height={100}
              className="h-20 w-auto"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {props.pages.map((page) => {
              const href = page.isHomePage ? "/au-industries" : `/au-industries/${page.slug}`;
              const active = page.isHomePage ? pathname === "/au-industries" : isActive(page.slug);
              const label = page.isHomePage ? "Home" : page.title;
              return (
                <Link
                  key={page.slug}
                  href={href}
                  className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? "text-[#B8860B] border-b-2 border-[#B8860B]"
                      : "text-gray-700 hover:text-[#B8860B]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/au-industries/quote"
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                pathname === "/au-industries/quote"
                  ? "text-[#B8860B] border-b-2 border-[#B8860B]"
                  : "text-gray-700 hover:text-[#B8860B]"
              }`}
            >
              Quote
            </Link>
            <Link
              href="/au-industries/contact"
              className={`ml-2 px-5 py-2 text-sm font-semibold uppercase tracking-wide border-2 border-[#B8860B] transition-colors ${
                pathname === "/au-industries/contact"
                  ? "bg-[#B8860B] text-white"
                  : "text-[#B8860B] hover:bg-[#B8860B] hover:text-white"
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
            className="md:hidden text-gray-700 hover:text-[#B8860B] p-2"
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
          <div className="md:hidden pb-4 space-y-1 border-t border-gray-200 pt-2">
            {props.pages.map((page) => {
              const href = page.isHomePage ? "/au-industries" : `/au-industries/${page.slug}`;
              const active = page.isHomePage ? pathname === "/au-industries" : isActive(page.slug);
              const label = page.isHomePage ? "Home" : page.title;
              return (
                <Link
                  key={page.slug}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 text-base font-semibold uppercase ${
                    active ? "text-[#B8860B]" : "text-gray-700 hover:text-[#B8860B]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/au-industries/quote"
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 text-base font-semibold uppercase ${
                pathname === "/au-industries/quote"
                  ? "text-[#B8860B]"
                  : "text-gray-700 hover:text-[#B8860B]"
              }`}
            >
              Quote
            </Link>
            <Link
              href="/au-industries/contact"
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 text-base font-semibold uppercase ${
                pathname === "/au-industries/contact"
                  ? "text-[#B8860B]"
                  : "text-gray-700 hover:text-[#B8860B]"
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
                  editMode ? "text-[#B8860B]" : "text-gray-700 hover:text-[#B8860B]"
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
