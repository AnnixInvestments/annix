"use client";

import {
  CALLOFF_STATUS,
  CALLOFF_STATUS_OPTIONS,
  type CalloffStatus,
} from "@annix/product-data/rubber/calloffStatus";
import { useState } from "react";

interface CalloffInputProps {
  maxQuantity: number;
  onAdd: (quantity: number, status: CalloffStatus, notes: string) => void;
  addButtonClassName?: string;
}

export function CalloffInput(props: CalloffInputProps) {
  const rawAddButtonClassName = props.addButtonClassName;
  const addButtonClassName = rawAddButtonClassName || "bg-blue-600 hover:bg-blue-700";
  const [quantity, setQuantity] = useState(0);
  const [status, setStatus] = useState<CalloffStatus>(CALLOFF_STATUS.REQUESTED);
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (quantity > 0) {
      props.onAdd(quantity, status, notes);
      setQuantity(0);
      setNotes("");
      setStatus(CALLOFF_STATUS.REQUESTED);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setQuantity(Math.max(0, quantity - 1))}
          className="p-1 text-gray-400 hover:text-gray-600 border rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.min(props.maxQuantity, Math.max(0, Number(e.target.value))))
          }
          className="w-16 text-center rounded-md border-gray-300 shadow-sm text-sm border p-1"
          min="0"
          max={props.maxQuantity}
        />
        <button
          onClick={() => setQuantity(Math.min(props.maxQuantity, quantity + 1))}
          className="p-1 text-gray-400 hover:text-gray-600 border rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-sm text-gray-500">rolls</span>
        <select
          value={status}
          onChange={(e) => setStatus(Number(e.target.value) as CalloffStatus)}
          className="rounded-md border-gray-300 shadow-sm text-sm border p-1"
        >
          {CALLOFF_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 rounded-md border-gray-300 shadow-sm text-sm border p-1"
        />
        <button
          onClick={handleAdd}
          disabled={quantity === 0}
          className={`px-3 py-1 text-sm text-white rounded disabled:opacity-50 ${addButtonClassName}`}
        >
          Add Calloff
        </button>
      </div>
    </div>
  );
}
