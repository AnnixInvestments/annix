import { fromISO } from "../../lib/datetime";

export interface CalendarEvent {
  uid: string;
  startsAt: string;
  endsAt: string | null;
  summary: string;
  location: string | null;
  description: string | null;
}

const PRODID = "-//Annix//Annix Orbit//EN";

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const first = line.slice(0, 75);
  const rest = line.slice(75);
  const continuations = rest.match(/.{1,74}/g);
  const parts = continuations ? continuations.map((chunk) => ` ${chunk}`) : [];
  return [first, ...parts].join("\r\n");
}

function formatUtc(iso: string): string {
  const dt = fromISO(iso).toUTC();
  return dt.isValid ? dt.toFormat("yyyyMMdd'T'HHmmss'Z'") : "";
}

function buildEvent(event: CalendarEvent, stamp: string): string[] {
  const start = formatUtc(event.startsAt);
  const rawEnd = event.endsAt;
  const fallbackEnd = fromISO(event.startsAt).plus({ hours: 1 }).toISO();
  const endSource = rawEnd ? rawEnd : fallbackEnd ? fallbackEnd : event.startsAt;
  const end = formatUtc(endSource);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ];
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

export function buildCalendar(events: CalendarEvent[], stampIso: string): string {
  const stamp = formatUtc(stampIso);
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Annix Orbit interviews",
  ];
  const body = events.flatMap((event) => buildEvent(event, stamp));
  const lines = [...header, ...body, "END:VCALENDAR"];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
