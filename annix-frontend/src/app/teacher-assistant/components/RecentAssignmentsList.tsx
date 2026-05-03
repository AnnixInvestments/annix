"use client";

import { Clock, X } from "lucide-react";
import { nowMillis } from "@/app/lib/datetime";
import type { RecentAssignmentEntry } from "@/app/lib/store/teacherAssistantStore";

interface RecentAssignmentsListProps {
  recent: RecentAssignmentEntry[];
  onOpen: (entry: RecentAssignmentEntry) => void;
  onForget: (id: string) => void;
}

export function RecentAssignmentsList(props: RecentAssignmentsListProps) {
  const { recent, onOpen, onForget } = props;
  if (recent.length === 0) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 max-w-3xl mx-auto mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#FFA500]" />
        Recent assignments
      </h3>
      <ul className="space-y-2">
        {recent.map((entry) => {
          const minutes = Math.floor((nowMillis() - entry.generatedAt) / 60_000);
          const ago =
            minutes < 1
              ? "just now"
              : minutes < 60
                ? `${minutes} min ago`
                : `${Math.floor(minutes / 60)} hr ago`;
          return (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[#f5f6ff] transition-colors"
            >
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="flex-1 text-left text-sm"
              >
                <div className="font-medium text-gray-900 truncate">{entry.assignment.title}</div>
                <div className="text-xs text-gray-500">
                  {entry.input.subject} · {entry.input.topic} · {ago}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onForget(entry.id)}
                className="p-1 text-gray-400 hover:text-red-600"
                aria-label="Remove from recent"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
