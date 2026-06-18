import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelGovernmentDocument } from "./entities/government-document.entity";
import { AnnixSentinelGovernmentDocumentRepository } from "./government-document.repository";

@Injectable()
export class PostgresAnnixSentinelGovernmentDocumentRepository
  extends TypeOrmCrudRepository<AnnixSentinelGovernmentDocument>
  implements AnnixSentinelGovernmentDocumentRepository
{
  constructor(
    @InjectRepository(AnnixSentinelGovernmentDocument)
    repository: Repository<AnnixSentinelGovernmentDocument>,
  ) {
    super(repository);
  }

  findAllOrderedByCategory(): Promise<AnnixSentinelGovernmentDocument[]> {
    return this.repository.find({
      order: { category: "ASC", sortOrder: "ASC" },
    });
  }
}
