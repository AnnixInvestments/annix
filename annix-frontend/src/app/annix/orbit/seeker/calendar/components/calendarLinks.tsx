"use client";

import { fromISO } from "@/app/lib/datetime";

export interface CalendarLinkEvent {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
}

function toUtcStamp(iso: string): string {
  const dt = fromISO(iso).toUTC();
  return dt.isValid ? dt.toFormat("yyyyMMdd'T'HHmmss'Z'") : "";
}

function endOrDefault(event: CalendarLinkEvent): string {
  const end = event.endsAt;
  if (end) return end;
  const fallback = fromISO(event.startsAt).plus({ hours: 1 }).toISO();
  return fallback ? fallback : event.startsAt;
}

export function googleCalendarUrl(event: CalendarLinkEvent): string {
  const start = toUtcStamp(event.startsAt);
  const end = toUtcStamp(endOrDefault(event));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
  });
  const location = event.location;
  const description = event.description;
  if (location) params.set("location", location);
  if (description) params.set("details", description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: CalendarLinkEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startsAt,
    enddt: endOrDefault(event),
  });
  const location = event.location;
  const description = event.description;
  if (location) params.set("location", location);
  if (description) params.set("body", description);
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function buildIcs(event: CalendarLinkEvent): string {
  const start = toUtcStamp(event.startsAt);
  const end = toUtcStamp(endOrDefault(event));
  const stamp = toUtcStamp(event.startsAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Annix//Annix Orbit//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];
  const location = event.location;
  const description = event.description;
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcs(event: CalendarLinkEvent): void {
  const ics = buildIcs(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "interview.ics";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function AddToCalendarButtons(props: { event: CalendarLinkEvent }) {
  const event = props.event;
  const linkClass =
    "px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">Add to calendar:</span>
      <a
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Google
      </a>
      <a
        href={outlookCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Outlook
      </a>
      <button type="button" onClick={() => downloadIcs(event)} className={linkClass}>
        Apple / .ics
      </button>
    </div>
  );
}
