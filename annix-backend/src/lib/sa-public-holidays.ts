import { DateTime } from "luxon";

const FIXED_HOLIDAYS = [
  { month: 1, day: 1 },
  { month: 3, day: 21 },
  { month: 4, day: 27 },
  { month: 5, day: 1 },
  { month: 6, day: 16 },
  { month: 8, day: 9 },
  { month: 9, day: 24 },
  { month: 12, day: 16 },
  { month: 12, day: 25 },
  { month: 12, day: 26 },
];

function easterSunday(year: number): DateTime {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return DateTime.fromObject({ year, month, day }, { zone: "Africa/Johannesburg" });
}

function saPublicHolidaysForYear(year: number): DateTime[] {
  const holidays: DateTime[] = FIXED_HOLIDAYS.map((h) =>
    DateTime.fromObject({ year, month: h.month, day: h.day }, { zone: "Africa/Johannesburg" }),
  );

  const easter = easterSunday(year);
  holidays.push(easter.minus({ days: 2 }));
  holidays.push(easter.plus({ days: 1 }));

  const withSubstitutes: DateTime[] = [];
  for (const h of holidays) {
    withSubstitutes.push(h);
    if (h.weekday === 7) {
      withSubstitutes.push(h.plus({ days: 1 }));
    }
  }

  return withSubstitutes;
}

export function isSAPublicHoliday(dt: DateTime): boolean {
  const holidays = saPublicHolidaysForYear(dt.year);
  return holidays.some((h) => h.hasSame(dt, "day"));
}
