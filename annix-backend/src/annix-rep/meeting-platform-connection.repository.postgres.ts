import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  MeetingPlatform,
  MeetingPlatformConnection,
  PlatformConnectionStatus,
} from "./entities/meeting-platform-connection.entity";
import { MeetingPlatformConnectionRepository } from "./meeting-platform-connection.repository";

@Injectable()
export class PostgresMeetingPlatformConnectionRepository
  extends TypeOrmCrudRepository<MeetingPlatformConnection>
  implements MeetingPlatformConnectionRepository
{
  constructor(
    @InjectRepository(MeetingPlatformConnection)
    repository: Repository<MeetingPlatformConnection>,
  ) {
    super(repository);
  }

  findByUser(userId: number): Promise<MeetingPlatformConnection[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  findByIdAndUser(id: number, userId: number): Promise<MeetingPlatformConnection | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  findByUserAndPlatform(
    userId: number,
    platform: MeetingPlatform,
  ): Promise<MeetingPlatformConnection | null> {
    return this.repository.findOne({ where: { userId, platform } });
  }

  findActive(): Promise<MeetingPlatformConnection[]> {
    return this.repository.find({
      where: { connectionStatus: PlatformConnectionStatus.ACTIVE },
    });
  }

  findNeedingTokenRefresh(threshold: Date): Promise<MeetingPlatformConnection[]> {
    return this.repository
      .createQueryBuilder("c")
      .where("c.connection_status = :status", { status: PlatformConnectionStatus.ACTIVE })
      .andWhere("c.token_expires_at IS NOT NULL")
      .andWhere("c.token_expires_at < :threshold", { threshold })
      .andWhere("c.refresh_token_encrypted IS NOT NULL")
      .getMany();
  }

  findActiveByPlatformAccount(
    platform: MeetingPlatform,
    accountId: string,
  ): Promise<MeetingPlatformConnection | null> {
    return this.repository.findOne({
      where: {
        platform,
        accountId,
        connectionStatus: PlatformConnectionStatus.ACTIVE,
      },
    });
  }

  async markError(
    connectionId: number,
    updates: Partial<MeetingPlatformConnection>,
  ): Promise<void> {
    await this.repository.update(
      connectionId,
      updates as QueryDeepPartialEntity<MeetingPlatformConnection>,
    );
  }
}
