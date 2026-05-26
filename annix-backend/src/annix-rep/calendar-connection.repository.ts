import { CrudRepository } from "../lib/persistence/crud-repository";
import { CalendarConnection, CalendarSyncStatus } from "./entities/calendar-connection.entity";
import { CalendarProvider } from "./entities/calendar-event.entity";

export abstract class CalendarConnectionRepository extends CrudRepository<CalendarConnection> {
  abstract findBySyncStatuses(statuses: CalendarSyncStatus[]): Promise<CalendarConnection[]>;
  abstract findByUser(userId: number): Promise<CalendarConnection[]>;
  abstract findByIdAndUser(id: number, userId: number): Promise<CalendarConnection | null>;
  abstract findByUserProviderEmail(
    userId: number,
    provider: CalendarProvider,
    accountEmail: string,
  ): Promise<CalendarConnection | null>;
  abstract findActiveByUser(userId: number): Promise<CalendarConnection[]>;
  abstract clearPrimaryForUser(userId: number): Promise<void>;
}
