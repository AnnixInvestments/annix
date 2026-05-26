import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcBatchAssignment } from "../entities/qc-batch-assignment.entity";
import { QcBatchAssignmentRepository } from "./qc-batch-assignment.repository";

@Injectable()
export class PostgresQcBatchAssignmentRepository
  extends TypeOrmCrudRepository<QcBatchAssignment>
  implements QcBatchAssignmentRepository
{
  constructor(@InjectRepository(QcBatchAssignment) repository: Repository<QcBatchAssignment>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcBatchAssignment[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { fieldKey: "ASC", batchNumber: "ASC" },
    });
  }

  findForJobCardOrderedByLineItemAndFieldKey(
    companyId: number,
    jobCardId: number,
  ): Promise<QcBatchAssignment[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { lineItemId: "ASC", fieldKey: "ASC" },
    });
  }

  findForCpo(companyId: number, cpoId: number): Promise<QcBatchAssignment[]> {
    return this.repository.find({
      where: { companyId, cpoId },
      order: { jobCardId: "ASC", fieldKey: "ASC", batchNumber: "ASC" },
    });
  }

  findByLineItemAndFieldKey(
    lineItemId: number,
    fieldKey: string,
  ): Promise<QcBatchAssignment | null> {
    return this.repository.findOne({
      where: { lineItemId, fieldKey },
    });
  }

  async deleteByIdForCompany(id: number, companyId: number): Promise<void> {
    await this.repository.delete({ id, companyId });
  }

  findLineItemsForFieldKey(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<QcBatchAssignment[]> {
    return this.repository.find({
      where: { companyId, jobCardId, fieldKey },
      select: ["lineItemId"],
    });
  }

  findForJobCardAndBatch(
    companyId: number,
    jobCardId: number,
    batchNumber: string,
  ): Promise<QcBatchAssignment[]> {
    return this.repository.find({
      where: { companyId, jobCardId, batchNumber },
    });
  }

  async linkPositectorUpload(
    companyId: number,
    jobCardId: number,
    batchNumber: string,
    positectorUploadId: number,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(QcBatchAssignment)
      .set({ positectorUploadId })
      .where("companyId = :companyId", { companyId })
      .andWhere("jobCardId = :jobCardId", { jobCardId })
      .andWhere("LOWER(TRIM(batchNumber)) = LOWER(TRIM(:batchNumber))", {
        batchNumber: batchNumber.trim(),
      })
      .andWhere("positectorUploadId IS NULL")
      .execute();
  }
}
