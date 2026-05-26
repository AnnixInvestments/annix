import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ExternalJobAlternate } from "../entities/external-job-alternate.entity";
import { ExternalJobAlternateRepository } from "./external-job-alternate.repository";

@Injectable()
export class PostgresExternalJobAlternateRepository
  extends TypeOrmCrudRepository<ExternalJobAlternate>
  implements ExternalJobAlternateRepository
{
  constructor(
    @InjectRepository(ExternalJobAlternate) repository: Repository<ExternalJobAlternate>,
  ) {
    super(repository);
  }

  findByExternalIds(externalIds: string[], sourceId: number): Promise<ExternalJobAlternate[]> {
    if (externalIds.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: { sourceExternalId: In(externalIds), sourceId },
      select: ["sourceExternalId", "canonicalExternalJobId"],
    });
  }

  async deleteByCanonicalId(canonicalExternalJobId: number): Promise<void> {
    await this.repository.delete({ canonicalExternalJobId });
  }

  async deleteByCanonicalIds(canonicalExternalJobIds: number[]): Promise<void> {
    if (canonicalExternalJobIds.length === 0) return;
    await this.repository.delete({ canonicalExternalJobId: In(canonicalExternalJobIds) });
  }
}
