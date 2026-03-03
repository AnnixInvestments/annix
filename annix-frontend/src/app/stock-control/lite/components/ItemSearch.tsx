"use client";

import { ChangeEvent, useMemo, useState } from "react";

interface SearchableItem {
  id: number;
  label: string;
  sublabel?: string;
}

interface ItemSearchProps<T extends SearchableItem> {
  items: T[];
  placeholder?: string;
  onSelect: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ItemSearch<T extends SearchableItem>({
  items,
  placeholder,
  onSelect,
  isLoading,
  emptyMessage,
}: ItemSearchProps<T>) {
  const [searchText, setSearchText] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) {
      return items;
    }
    const lower = searchText.toLowerCase();
    return items.filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(lower);
      const sublabelMatch = item.sublabel ? item.sublabel.toLowerCase().includes(lower) : false;
      return labelMatch || sublabelMatch;
    });
  }, [items, searchText]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 bg-gray-100 pb-2">
        <input
          type="text"
          value={searchText}
          onChange={handleSearchChange}
          placeholder={placeholder || "Search..."}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          {filteredItems.length} of {items.length} items
        </p>
      </div>

      <div className="mt-2 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-white rounded-lg">
            {emptyMessage || "No items found"}
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-teal-500 hover:shadow-md transition-all"
            >
              <div className="font-medium text-gray-900">{item.label}</div>
              {item.sublabel && <div className="text-sm text-gray-500 mt-1">{item.sublabel}</div>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
