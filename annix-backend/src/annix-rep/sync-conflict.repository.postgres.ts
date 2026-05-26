import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SyncConflict } from "./entities/sync-conflict.entity";
import { SyncConflictRepository } from "./sync-conflict.repository";

@Injectable()
export class PostgresSyncConflictRepository
  extends TypeOrmCrudRepository<SyncConflict>
  implements SyncConflictRepository
{
  constructor(@InjectRepository(SyncConflict) repository: Repository<SyncConflict>) {
    super(repository);
  }

  findPendingForPair(
    userId: number,
    meetingId: number,
    calendarEventId: number,
  ): Promise<SyncConflict | null> {
    return this.repository.findOne({
      where: {
        userId,
        meetingId,
        calendarEventId,
        resolution: "pending",
      },
    });
  }

  findPendingForUser(userId: number): Promise<SyncConflict[]> {
    return this.repository.find({
      where: { userId, resolution: "pending" },
      relations: ["meeting", "calendarEvent"],
      order: { createdAt: "DESC" },
    });
  }

  findByIdAndUser(id: number, userId: number): Promise<SyncConflict | null> {
    return this.repository.findOne({
      where: { id, userId },
      relations: ["meeting", "calendarEvent"],
    });
  }

  countPendingForUser(userId: number): Promise<number> {
    return this.repository.count({
      where: { userId, resolution: "pending" },
    });
  }
}
