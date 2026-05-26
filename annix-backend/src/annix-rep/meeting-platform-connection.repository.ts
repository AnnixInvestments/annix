import { CrudRepository } from "../lib/persistence/crud-repository";
import {
  MeetingPlatform,
  MeetingPlatformConnection,
} from "./entities/meeting-platform-connection.entity";

export abstract class MeetingPlatformConnectionRepository extends CrudRepository<MeetingPlatformConnection> {
  abstract findByUser(userId: number): Promise<MeetingPlatformConnection[]>;
  abstract findByIdAndUser(id: number, userId: number): Promise<MeetingPlatformConnection | null>;
  abstract findByUserAndPlatform(
    userId: number,
    platform: MeetingPlatform,
  ): Promise<MeetingPlatformConnection | null>;
  abstract findActive(): Promise<MeetingPlatformConnection[]>;
  abstract findNeedingTokenRefresh(threshold: Date): Promise<MeetingPlatformConnection[]>;
  abstract findActiveByPlatformAccount(
    platform: MeetingPlatform,
    accountId: string,
  ): Promise<MeetingPlatformConnection | null>;
  abstract markError(
    connectionId: number,
    updates: Partial<MeetingPlatformConnection>,
  ): Promise<void>;
}
