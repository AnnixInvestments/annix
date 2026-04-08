"use client";

import { useEffect, useRef, useState } from "react";

interface InlineCategoryEditProps {
  itemId: number;
  currentCategory: string | null;
  categories: string[];
  onCategoryChange: (itemId: number, category: string) => void;
}

export function InlineCategoryEdit(props: InlineCategoryEditProps) {
  const { itemId, currentCategory, categories, onCategoryChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (category: string) => {
    onCategoryChange(itemId, category);
    setIsOpen(false);
    setCustomValue("");
  };

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim();
    if (trimmed) {
      handleSelect(trimmed);
    }
  };

  const label = currentCategory || "Uncategorized";
  const isCategorized = !!currentCategory;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
          isCategorized
            ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        {label}
        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto left-0">
          <div className="px-2 py-1.5">
            <input
              type="text"
              placeholder="New category..."
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit();
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              autoFocus
            />
          </div>
          {categories
            .filter((cat) => {
              if (!customValue) return true;
              return cat.toLowerCase().includes(customValue.toLowerCase());
            })
            .map((cat) => {
              const isActive = cat === currentCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(cat);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    isActive ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
