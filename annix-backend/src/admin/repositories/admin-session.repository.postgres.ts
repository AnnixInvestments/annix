import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AdminSession } from "../entities/admin-session.entity";
import { AdminSessionRepository } from "./admin-session.repository";

@Injectable()
export class PostgresAdminSessionRepository
  extends TypeOrmCrudRepository<AdminSession>
  implements AdminSessionRepository
{
  constructor(@InjectRepository(AdminSession) repository: Repository<AdminSession>) {
    super(repository);
  }

  findActiveByUserAndToken(userId: number, sessionToken: string): Promise<AdminSession | null> {
    return this.repository.findOne({
      where: { userId, sessionToken, isRevoked: false },
    });
  }

  findActiveByTokenWithUser(sessionToken: string, now: Date): Promise<AdminSession | null> {
    return this.repository.findOne({
      where: {
        sessionToken,
        isRevoked: false,
        expiresAt: MoreThan(now),
      },
      relations: ["user", "user.roles"],
    });
  }

  countActive(now: Date, recentActivityThreshold: Date): Promise<number> {
    return this.repository.count({
      where: {
        isRevoked: false,
        expiresAt: MoreThan(now),
        lastActiveAt: MoreThan(recentActivityThreshold),
      },
    });
  }

  findLatestByUser(userId: number): Promise<AdminSession | null> {
    return this.repository.findOne({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  findRecentByUser(userId: number, limit: number): Promise<AdminSession[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async revokeAllForUser(userId: number, revokedAt: Date): Promise<void> {
    await this.repository.update({ userId, isRevoked: false }, { isRevoked: true, revokedAt });
  }
}
