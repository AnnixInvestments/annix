export enum CalendarProvider {
  GOOGLE = "google",
  OUTLOOK = "outlook",
  APPLE = "apple",
  CALDAV = "caldav",
}

export enum CalendarSyncStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  ERROR = "error",
  EXPIRED = "expired",
}

export enum CalendarEventStatus {
  CONFIRMED = "confirmed",
  TENTATIVE = "tentative",
  CANCELLED = "cancelled",
}
