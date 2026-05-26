import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcEnvironmentalBatchLink } from "../entities/qc-environmental-batch-link.entity";

export abstract class QcEnvironmentalBatchLinkRepository extends CrudRepository<QcEnvironmentalBatchLink> {
  abstract findByAssignmentAndRecord(
    batchAssignmentId: number,
    environmentalRecordId: number,
  ): Promise<QcEnvironmentalBatchLink | null>;
}
