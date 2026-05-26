import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, MoreThan, Repository } from "typeorm";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SupplierSession } from "./entities/supplier-session.entity";
import { SupplierSessionRepository } from "./supplier-session.repository";

@Injectable()
export class PostgresSupplierSessionRepository
  extends TypeOrmCrudRepository<SupplierSession>
  implements SupplierSessionRepository
{
  constructor(@InjectRepository(SupplierSession) repository: Repository<SupplierSession>) {
    super(repository);
  }

  findActiveByToken(sessionToken: string, relations?: string[]): Promise<SupplierSession | null> {
    return this.repository.findOne({
      where: { sessionToken, isActive: true },
      relations,
    });
  }

  async updateActiveByProfile(
    profileIdField: string,
    profileId: number,
    patch: DeepPartial<SupplierSession>,
  ): Promise<void> {
    await this.repository.update(
      { [profileIdField]: profileId, isActive: true } as FindOptionsWhere<SupplierSession>,
      patch as Record<string, unknown>,
    );
  }

  countActiveSince(currentTime: Date, activitySince: Date): Promise<number> {
    return this.repository.count({
      where: {
        isActive: true,
        expiresAt: MoreThan(currentTime),
        lastActivity: MoreThan(activitySince),
      },
    });
  }
}
