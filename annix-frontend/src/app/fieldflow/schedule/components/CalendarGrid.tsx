"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import type { Meeting } from "@/app/lib/api/annixRepApi";
import { fromISO, fromJSDate, now } from "@/app/lib/datetime";
import { DraggableMeeting } from "./DraggableMeeting";
import { TimeSlot } from "./TimeSlot";

interface CalendarGridProps {
  meetings: Meeting[];
  date: Date;
  startHour?: number;
  endHour?: number;
  slotDurationMinutes?: number;
  onReschedule: (meetingId: number, newStart: Date, newEnd: Date) => void;
}

export function CalendarGrid(props: CalendarGridProps) {
  const {
    meetings,
    date,
    startHour = 8,
    endHour = 18,
    slotDurationMinutes = 30,
    onReschedule,
  } = props;
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );

  const totalSlots = ((endHour - startHour) * 60) / slotDurationMinutes;
  const slots: Date[] = Array.from({ length: totalSlots }, (_, i) => {
    const totalMinutes = startHour * 60 + i * slotDurationMinutes;
    return fromJSDate(date)
      .set({ hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60, second: 0, millisecond: 0 })
      .toJSDate();
  });

  const handleDragStart = (event: DragStartEvent) => {
    const meetingId = event.active.id;
    const meeting = meetings.find((m) => m.id === Number(meetingId));
    if (meeting) {
      setActiveMeeting(meeting);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveMeeting(null);

    const { active, over } = event;
    if (!over) return;

    const meetingId = Number(active.id);
    const slotDt = fromISO(over.id as string);

    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return;

    const originalStart = fromJSDate(meeting.scheduledStart);
    const originalEnd = fromJSDate(meeting.scheduledEnd);
    const durationMs = originalEnd.toMillis() - originalStart.toMillis();

    const newStart = slotDt.toJSDate();
    const newEnd = slotDt.plus({ milliseconds: durationMs }).toJSDate();

    if (slotDt.toMillis() !== originalStart.toMillis()) {
      onReschedule(meetingId, newStart, newEnd);
    }
  };

  const meetingPositions = meetings.map((meeting) => {
    const start = fromJSDate(meeting.scheduledStart);
    const end = fromJSDate(meeting.scheduledEnd);

    const startMinutesFromDayStart = start.hour * 60 + start.minute;
    const gridStartMinutes = startHour * 60;

    const topOffset = ((startMinutesFromDayStart - gridStartMinutes) / slotDurationMinutes) * 60;

    const durationMinutes = end.diff(start, "minutes").minutes;
    const height = (durationMinutes / slotDurationMinutes) * 60;

    return {
      meeting,
      top: Math.max(0, topOffset),
      height: Math.max(30, height),
    };
  });

  const currentTimeDt = now();
  const currentTimeMinutes = currentTimeDt.hour * 60 + currentTimeDt.minute;
  const gridStartMinutes = startHour * 60;
  const gridEndMinutes = endHour * 60;

  const showCurrentTimeLine =
    currentTimeMinutes >= gridStartMinutes && currentTimeMinutes <= gridEndMinutes;
  const currentTimeTop = ((currentTimeMinutes - gridStartMinutes) / slotDurationMinutes) * 60;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="w-16 flex-shrink-0 bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
          {slots.map((slot, index) => (
            <div
              key={index}
              className="h-[60px] px-2 py-1 text-xs text-gray-500 dark:text-gray-400 text-right border-b border-gray-100 dark:border-slate-700"
            >
              {fromJSDate(slot).toFormat("HH:mm")}
            </div>
          ))}
        </div>

        <div className="flex-1 relative">
          {slots.map((slot, index) => (
            <TimeSlot key={fromJSDate(slot).toISO() ?? ""} id={fromJSDate(slot).toISO() ?? ""} time={slot} />
          ))}

          {showCurrentTimeLine && (
            <div
              className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
              style={{ top: `${currentTimeTop}px` }}
            >
              <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
            </div>
          )}

          {meetingPositions.map(({ meeting, top, height }) => (
            <div
              key={meeting.id}
              className="absolute left-2 right-2 z-10"
              style={{ top: `${top}px`, height: `${height}px` }}
            >
              <DraggableMeeting meeting={meeting} height={height} />
            </div>
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeMeeting && (
          <div className="bg-blue-500 text-white rounded-lg shadow-lg p-3 w-64 opacity-90">
            <div className="font-medium text-sm truncate">{activeMeeting.title}</div>
            {activeMeeting.prospect && (
              <div className="text-xs text-blue-100 truncate">
                {activeMeeting.prospect.companyName}
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
