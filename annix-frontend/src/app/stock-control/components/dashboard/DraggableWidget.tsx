"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

interface DraggableWidgetProps {
  id: string;
  children: ReactNode;
  isEditMode: boolean;
}

export function DraggableWidget(props: DraggableWidgetProps) {
  const { id, children, isEditMode } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing bg-white border border-gray-300 rounded-md p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
      )}
      {isEditMode && (
        <div className="absolute inset-0 border-2 border-dashed border-teal-300 rounded-lg pointer-events-none z-10" />
      )}
      {children}
    </div>
  );
}
