"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Meeting, MeetingStatus, MeetingType } from "@/app/lib/api/annixRepApi";

const meetingTypeColors: Record<MeetingType, { bg: string; border: string }> = {
  in_person: { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-500" },
  phone: { bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-500" },
  video: { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-500" },
};

const statusIndicators: Record<MeetingStatus, string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-500",
  no_show: "bg-red-500",
};

interface DraggableMeetingProps {
  meeting: Meeting;
  height: number;
}

export function DraggableMeeting({ meeting, height }: DraggableMeetingProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meeting.id,
    disabled: meeting.status === "completed" || meeting.status === "in_progress",
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    height: "100%",
  };

  const colors = meetingTypeColors[meeting.meetingType] || meetingTypeColors.in_person;
  const statusColor = statusIndicators[meeting.status];

  const startTime = new Date(meeting.scheduledStart);
  const endTime = new Date(meeting.scheduledEnd);
  const timeStr = `${startTime.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;

  const isCompact = height < 50;
  const isDisabled = meeting.status === "completed" || meeting.status === "in_progress";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        ${colors.bg} ${colors.border}
        border-l-4 rounded-r-lg p-2 h-full overflow-hidden
        ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"}
        ${isDisabled ? "cursor-not-allowed opacity-70" : "cursor-grab active:cursor-grabbing"}
        transition-shadow hover:shadow-md
      `}
    >
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <div
            className={`font-medium text-gray-900 dark:text-white truncate ${isCompact ? "text-xs" : "text-sm"}`}
          >
            {meeting.title}
          </div>
          {!isCompact && (
            <>
              {meeting.prospect && (
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {meeting.prospect.companyName}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{timeStr}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
