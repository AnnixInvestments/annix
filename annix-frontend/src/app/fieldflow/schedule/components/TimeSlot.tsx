"use client";

import { useDroppable } from "@dnd-kit/core";

interface TimeSlotProps {
  id: string;
  time: Date;
}

export function TimeSlot({ id, time }: TimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        h-[60px] border-b border-gray-100 dark:border-slate-700
        ${isOver ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-slate-800"}
        transition-colors
      `}
    />
  );
}
