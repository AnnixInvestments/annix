import { CrudRepository } from "../lib/persistence/crud-repository";
import { SyncConflict } from "./entities/sync-conflict.entity";

export abstract class SyncConflictRepository extends CrudRepository<SyncConflict> {
  abstract findPendingForPair(
    userId: number,
    meetingId: number,
    calendarEventId: number,
  ): Promise<SyncConflict | null>;
  abstract findPendingForUser(userId: number): Promise<SyncConflict[]>;
  abstract findByIdAndUser(id: number, userId: number): Promise<SyncConflict | null>;
  abstract countPendingForUser(userId: number): Promise<number>;
}
