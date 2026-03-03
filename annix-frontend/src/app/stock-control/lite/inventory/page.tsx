"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { LiteStockItem, liteApi } from "../lib/liteApi";

export default function InventorySearchPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<LiteStockItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedItem, setSelectedItem] = useState<LiteStockItem | null>(null);

  useEffect(() => {
    liteApi
      .stockItems()
      .then((items) => {
        setStockItems(items);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load inventory: ${err.message}`);
        setIsLoading(false);
      });
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) {
      return stockItems;
    }
    const lower = searchText.toLowerCase();
    return stockItems.filter((item) => {
      const stockMatch = item.stockNumber.toLowerCase().includes(lower);
      const descMatch = item.description.toLowerCase().includes(lower);
      const catMatch = item.categoryName.toLowerCase().includes(lower);
      return stockMatch || descMatch || catMatch;
    });
  }, [stockItems, searchText]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  if (error) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/stock-control/lite" className="text-teal-600 hover:text-teal-700">
          ← Back to Menu
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-4">Search Inventory</h1>

      <div className="sticky top-0 bg-gray-100 pb-2 z-10">
        <input
          type="text"
          value={searchText}
          onChange={handleSearchChange}
          placeholder="Search by stock number, description, or category..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          {filteredItems.length} of {stockItems.length} items
        </p>
      </div>

      {selectedItem && (
        <div className="mt-4 bg-white rounded-lg shadow-md p-4 border-l-4 border-teal-600">
          <div className="flex items-start justify-between">
            <h2 className="font-bold text-gray-900">{selectedItem.stockNumber}</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-800 mt-1">{selectedItem.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium">{selectedItem.categoryName}</p>
            </div>
            <div>
              <p className="text-gray-500">Available</p>
              <p className="font-medium">
                {selectedItem.currentQuantity} {selectedItem.unit}
              </p>
            </div>
          </div>
          <div
            className={
              "mt-3 px-3 py-2 rounded text-center text-sm font-medium " +
              (selectedItem.currentQuantity > 0
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800")
            }
          >
            {selectedItem.currentQuantity > 0 ? "In Stock" : "Out of Stock"}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-white rounded-lg">
            No items found matching your search
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className={
                "w-full text-left bg-white p-4 rounded-lg shadow-sm border transition-all " +
                (selectedItem && selectedItem.id === item.id
                  ? "border-teal-500 shadow-md"
                  : "border-gray-200 hover:border-teal-500 hover:shadow-md")
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{item.stockNumber}</div>
                  <div className="text-sm text-gray-600 truncate">{item.description}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.categoryName}</div>
                </div>
                <div className="ml-4 text-right">
                  <div
                    className={
                      "text-sm font-medium " +
                      (item.currentQuantity > 0 ? "text-green-600" : "text-red-600")
                    }
                  >
                    {item.currentQuantity}
                  </div>
                  <div className="text-xs text-gray-400">{item.unit}</div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
