import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixRepSessionRepository } from "./annix-rep-session.repository";
import { AnnixRepSession } from "./entities/annix-rep-session.entity";

@Injectable()
export class PostgresAnnixRepSessionRepository
  extends TypeOrmCrudRepository<AnnixRepSession>
  implements AnnixRepSessionRepository
{
  constructor(@InjectRepository(AnnixRepSession) repository: Repository<AnnixRepSession>) {
    super(repository);
  }

  findActiveByToken(sessionToken: string): Promise<AnnixRepSession | null> {
    return this.repository.findOne({
      where: { sessionToken, isActive: true },
    });
  }

  findActiveByTokenWithUser(sessionToken: string): Promise<AnnixRepSession | null> {
    return this.repository.findOne({
      where: { sessionToken, isActive: true },
      relations: ["user"],
    });
  }

  async updateActiveUserSessions(userId: number, updates: Partial<AnnixRepSession>): Promise<void> {
    await this.repository.update(
      { userId, isActive: true },
      updates as QueryDeepPartialEntity<AnnixRepSession>,
    );
  }
}
