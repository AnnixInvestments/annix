"use client";

import type { StockItem } from "@/app/lib/api/stockControlApi";

interface ReorderAlertProps {
  items: StockItem[];
}

export function ReorderAlert({ items }: ReorderAlertProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800">
            Low Stock Warning ({items.length} item{items.length !== 1 ? "s" : ""})
          </h3>
          <ul className="mt-2 space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="text-sm text-amber-700 flex items-center justify-between"
              >
                <span className="truncate mr-2">{item.name}</span>
                <span className="flex-shrink-0 font-medium">
                  {item.quantity} / {item.minStockLevel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
