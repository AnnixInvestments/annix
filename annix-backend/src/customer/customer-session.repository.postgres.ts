import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, MoreThan, Repository } from "typeorm";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerSessionRepository } from "./customer-session.repository";
import { CustomerSession } from "./entities/customer-session.entity";

@Injectable()
export class PostgresCustomerSessionRepository
  extends TypeOrmCrudRepository<CustomerSession>
  implements CustomerSessionRepository
{
  constructor(@InjectRepository(CustomerSession) repository: Repository<CustomerSession>) {
    super(repository);
  }

  findActiveByToken(sessionToken: string, relations?: string[]): Promise<CustomerSession | null> {
    return this.repository.findOne({
      where: { sessionToken, isActive: true },
      relations,
    });
  }

  async updateActiveByProfile(
    profileIdField: string,
    profileId: number,
    patch: DeepPartial<CustomerSession>,
  ): Promise<void> {
    await this.repository.update(
      { [profileIdField]: profileId, isActive: true } as FindOptionsWhere<CustomerSession>,
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
