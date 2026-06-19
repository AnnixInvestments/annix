import { User } from "../../user/entities/user.entity";
import { CalendarProvider, CalendarSyncStatus } from "./calendar.enums";
import { CalendarEvent } from "./calendar-event.entity";

export { CalendarProvider, CalendarSyncStatus };

export class CalendarConnection {
  id: number;

  user: User;

  userId: number;

  provider: CalendarProvider;

  accountEmail: string;

  accountName: string | null;

  accessTokenEncrypted: string;

  refreshTokenEncrypted: string | null;

  tokenExpiresAt: Date | null;

  caldavUrl: string | null;

  syncStatus: CalendarSyncStatus;

  lastSyncAt: Date | null;

  lastSyncError: string | null;

  syncToken: string | null;

  selectedCalendars: string[] | null;

  isPrimary: boolean;

  displayColor: string;

  events: CalendarEvent[];

  createdAt: Date;

  updatedAt: Date;
}
