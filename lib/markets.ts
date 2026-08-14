const NY = "America/New_York";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const WEEKDAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export const WORLD_ZONES = [
  { id: "ny", label: "NEW YORK", tz: "America/New_York" },
  { id: "ldn", label: "LONDON", tz: "Europe/London" },
  { id: "tko", label: "TOKYO", tz: "Asia/Tokyo" },
  { id: "syd", label: "SYDNEY", tz: "Australia/Sydney" },
] as const;

export type ZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

export type MarketWindow = {
  open: boolean;
  opensAt: Date;
  closesAt: Date;
  openCaption: string;
  closeCaption: string;
};

const US_EQUITY_HOLIDAYS = new Set([
  "2025-01-01",
  "2025-01-20",
  "2025-02-17",
  "2025-04-18",
  "2025-05-26",
  "2025-06-19",
  "2025-07-04",
  "2025-09-01",
  "2025-11-27",
  "2025-12-25",
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-06-18",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
]);

export function zoneParts(date: Date, timeZone: string): ZoneParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour) % 24,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: WEEKDAY_INDEX[bag.weekday] ?? 0,
  };
}

export function zonedDate(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): Date {
  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  const asZone = zoneParts(new Date(utc), timeZone);
  const zoneAsUtc = Date.UTC(
    asZone.year,
    asZone.month - 1,
    asZone.day,
    asZone.hour,
    asZone.minute,
    asZone.second,
  );
  return new Date(utc - (zoneAsUtc - utc));
}

function addCalendarDays(year: number, month: number, day: number, amount: number) {
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function dateStamp(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isWeekend(weekday: number) {
  return weekday === 0 || weekday === 6;
}

function isUsHoliday(year: number, month: number, day: number) {
  return US_EQUITY_HOLIDAYS.has(dateStamp(year, month, day));
}

function nextWeekday(
  year: number,
  month: number,
  day: number,
  weekday: number,
  target: number,
) {
  const delta = (target - weekday + 7) % 7;
  const next = addCalendarDays(year, month, day, delta);
  return { ...next, weekday: target };
}

function nextTradingDay(
  year: number,
  month: number,
  day: number,
  weekday: number,
) {
  let current = { year, month, day, weekday };
  for (let i = 0; i < 14; i += 1) {
    const next = addCalendarDays(current.year, current.month, current.day, 1);
    current = { ...next, weekday: (current.weekday + 1) % 7 };
    if (!isWeekend(current.weekday) && !isUsHoliday(current.year, current.month, current.day)) {
      return current;
    }
  }
  return current;
}

function previousWeekday(
  year: number,
  month: number,
  day: number,
  weekday: number,
  target: number,
) {
  const delta = (weekday - target + 7) % 7;
  const next = addCalendarDays(year, month, day, -delta);
  return { ...next, weekday: target };
}

export function forexWindow(now: Date): MarketWindow {
  const parts = zoneParts(now, NY);
  const minutes = parts.hour * 60 + parts.minute;
  const closed =
    parts.weekday === 6 ||
    (parts.weekday === 5 && minutes >= 17 * 60) ||
    (parts.weekday === 0 && minutes < 17 * 60);

  if (!closed) {
    const sunday =
      parts.weekday === 0
        ? { year: parts.year, month: parts.month, day: parts.day, weekday: 0 }
        : previousWeekday(parts.year, parts.month, parts.day, parts.weekday, 0);
    const friday =
      parts.weekday === 5
        ? { year: parts.year, month: parts.month, day: parts.day, weekday: 5 }
        : nextWeekday(parts.year, parts.month, parts.day, parts.weekday, 5);
    return {
      open: true,
      opensAt: zonedDate(NY, sunday.year, sunday.month, sunday.day, 17),
      closesAt: zonedDate(NY, friday.year, friday.month, friday.day, 17),
      openCaption: "SUN 17:00 ET",
      closeCaption: "FRI 17:00 ET",
    };
  }

  const sunday =
    parts.weekday === 0 && minutes < 17 * 60
      ? { year: parts.year, month: parts.month, day: parts.day, weekday: 0 }
      : nextWeekday(parts.year, parts.month, parts.day, parts.weekday, 0);
  const friday = nextWeekday(sunday.year, sunday.month, sunday.day, 0, 5);
  return {
    open: false,
    opensAt: zonedDate(NY, sunday.year, sunday.month, sunday.day, 17),
    closesAt: zonedDate(NY, friday.year, friday.month, friday.day, 17),
    openCaption: "SUN 17:00 ET",
    closeCaption: "FRI 17:00 ET",
  };
}

export function equityWindow(now: Date): MarketWindow {
  const parts = zoneParts(now, NY);
  const minutes = parts.hour * 60 + parts.minute;
  const tradingDay =
    !isWeekend(parts.weekday) &&
    !isUsHoliday(parts.year, parts.month, parts.day);
  const openMins = 9 * 60 + 30;
  const closeMins = 16 * 60;

  if (tradingDay && minutes < closeMins) {
    return {
      open: minutes >= openMins,
      opensAt: zonedDate(NY, parts.year, parts.month, parts.day, 9, 30),
      closesAt: zonedDate(NY, parts.year, parts.month, parts.day, 16),
      openCaption: "TODAY 09:30 ET",
      closeCaption: "TODAY 16:00 ET",
    };
  }

  const next = nextTradingDay(parts.year, parts.month, parts.day, parts.weekday);
  const dayLabel = `${WEEKDAY_SHORT[next.weekday]}`;
  return {
    open: false,
    opensAt: zonedDate(NY, next.year, next.month, next.day, 9, 30),
    closesAt: zonedDate(NY, next.year, next.month, next.day, 16),
    openCaption: `${dayLabel} 09:30 ET`,
    closeCaption: `${dayLabel} 16:00 ET`,
  };
}

export function formatZoneClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatZoneWeekday(date: Date, timeZone: string) {
  const weekday = zoneParts(date, timeZone).weekday;
  return WEEKDAY_SHORT[weekday];
}
