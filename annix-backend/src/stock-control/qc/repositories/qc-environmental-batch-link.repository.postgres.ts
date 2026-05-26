import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcEnvironmentalBatchLink } from "../entities/qc-environmental-batch-link.entity";
import { QcEnvironmentalBatchLinkRepository } from "./qc-environmental-batch-link.repository";

@Injectable()
export class PostgresQcEnvironmentalBatchLinkRepository
  extends TypeOrmCrudRepository<QcEnvironmentalBatchLink>
  implements QcEnvironmentalBatchLinkRepository
{
  constructor(
    @InjectRepository(QcEnvironmentalBatchLink) repository: Repository<QcEnvironmentalBatchLink>,
  ) {
    super(repository);
  }

  findByAssignmentAndRecord(
    batchAssignmentId: number,
    environmentalRecordId: number,
  ): Promise<QcEnvironmentalBatchLink | null> {
    return this.repository.findOne({
      where: { batchAssignmentId, environmentalRecordId },
    });
  }
}
