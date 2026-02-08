"use client";

import { useState } from "react";
import { corpId } from "@/app/lib/corpId";

interface AuHeaderProps {
  onSearch?: (query: string) => void;
  onExport?: () => void;
  onImport?: () => void;
}

export function AuHeader({ onSearch, onExport, onImport }: AuHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const colors = corpId.colors.portal.auRubber;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header
      className="h-16 flex items-center justify-between px-6 shadow-md"
      style={{ backgroundColor: colors.background }}
    >
      <div className="flex items-center">
        <div className="text-2xl font-bold" style={{ color: colors.accent }}>
          AU
        </div>
        <span className="ml-2 text-white text-lg font-medium">Rubber App</span>
      </div>

      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search products, orders..."
            className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-opacity-20"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {onExport && (
          <button
            onClick={onExport}
            className="px-4 py-2 text-sm font-medium text-white bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg hover:bg-opacity-20 transition-colors"
          >
            EXPORT
          </button>
        )}
        {onImport && (
          <button
            onClick={onImport}
            className="px-4 py-2 text-sm font-medium text-white bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg hover:bg-opacity-20 transition-colors"
          >
            IMPORT
          </button>
        )}
        <button className="relative p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
