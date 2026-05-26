import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { AnonymousDraftRepository } from "./anonymous-draft.repository";
import { AnonymousDraft } from "./entities/anonymous-draft.entity";

@Injectable()
export class PostgresAnonymousDraftRepository
  extends TypeOrmCrudRepository<AnonymousDraft>
  implements AnonymousDraftRepository
{
  constructor(@InjectRepository(AnonymousDraft) repository: Repository<AnonymousDraft>) {
    super(repository);
  }

  findLatestUnclaimedByEmail(customerEmail: string): Promise<AnonymousDraft | null> {
    return this.repository.findOne({
      where: {
        customerEmail,
        isClaimed: false,
      },
      order: { createdAt: "DESC" },
    });
  }

  findByRecoveryToken(token: string): Promise<AnonymousDraft | null> {
    return this.repository.findOne({
      where: { recoveryToken: token },
    });
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(before),
    });
    return result.affected || 0;
  }

  async searchUnclaimedPaginated(params: {
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ items: AnonymousDraft[]; total: number }> {
    const qb = this.repository.createQueryBuilder("anon").where("anon.isClaimed = false");
    if (params.search) {
      const escaped = params.search.replace(/%/g, "\\%").replace(/_/g, "\\_");
      qb.andWhere("(anon.projectName ILIKE :search OR anon.customerEmail ILIKE :search)", {
        search: `%${escaped}%`,
      });
    }
    if (params.dateFrom && params.dateTo) {
      qb.andWhere("anon.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      });
    }
    const total = await qb.getCount();
    const items = await qb.getMany();
    return { items, total };
  }
}
