import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelApiKeyRepository } from "./api-key.repository";
import { AnnixSentinelApiKey } from "./entities/api-key.entity";

@Injectable()
export class PostgresAnnixSentinelApiKeyRepository
  extends TypeOrmCrudRepository<AnnixSentinelApiKey>
  implements AnnixSentinelApiKeyRepository
{
  constructor(@InjectRepository(AnnixSentinelApiKey) repository: Repository<AnnixSentinelApiKey>) {
    super(repository);
  }

  findActiveByKeyHash(keyHash: string): Promise<AnnixSentinelApiKey | null> {
    return this.repository.findOne({ where: { keyHash, active: true } });
  }

  findByIdAndCompany(id: number, companyId: number): Promise<AnnixSentinelApiKey | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByCompanyNewestFirst(companyId: number): Promise<AnnixSentinelApiKey[]> {
    return this.repository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
  }
}
