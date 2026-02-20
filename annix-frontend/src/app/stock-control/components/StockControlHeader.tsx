"use client";

import { useState } from "react";
import { corpId } from "@/app/lib/corpId";

interface StockControlHeaderProps {
  onSearch?: (query: string) => void;
  lowStockCount?: number;
}

export function StockControlHeader({ onSearch, lowStockCount = 0 }: StockControlHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const colors = corpId.colors.portal.stockControl;

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
          ASCA
        </div>
        <span className="ml-2 text-white text-lg font-medium">Stock Control</span>
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
            placeholder="Search inventory, job cards..."
            className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:bg-opacity-20"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button className="relative p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {lowStockCount > 0 && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-teal-700" />
          )}
        </button>
      </div>
    </header>
  );
}
