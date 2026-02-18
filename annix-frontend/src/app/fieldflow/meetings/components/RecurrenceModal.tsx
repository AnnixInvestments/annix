"use client";

import { useState } from "react";
import type { RecurrenceUpdateScope } from "@/app/lib/api/annixRepApi";

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: RecurrenceUpdateScope) => void;
  title: string;
  description: string;
  actionLabel: string;
  isDestructive?: boolean;
}

export function RecurrenceModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionLabel,
  isDestructive = false,
}: RecurrenceModalProps) {
  const [selectedScope, setSelectedScope] = useState<RecurrenceUpdateScope>("this");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedScope);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>

          <div className="space-y-3 mb-6">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="this"
                checked={selectedScope === "this"}
                onChange={() => setSelectedScope("this")}
                className="mt-0.5 w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">This event only</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Only affects this single occurrence
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="future"
                checked={selectedScope === "future"}
                onChange={() => setSelectedScope("future")}
                className="mt-0.5 w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  This and following events
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Affects this event and all future occurrences
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={selectedScope === "all"}
                onChange={() => setSelectedScope("all")}
                className="mt-0.5 w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  All events in the series
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Affects all past and future occurrences
                </div>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
