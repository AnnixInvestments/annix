import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { JobCard } from "../../entities/job-card.entity";
import { QcDefelskoBatch } from "../entities/qc-defelsko-batch.entity";
import { type DefelskoBatchMatch, QcDefelskoBatchRepository } from "./qc-defelsko-batch.repository";

@Injectable()
export class PostgresQcDefelskoBatchRepository
  extends TypeOrmCrudRepository<QcDefelskoBatch>
  implements QcDefelskoBatchRepository
{
  constructor(@InjectRepository(QcDefelskoBatch) repository: Repository<QcDefelskoBatch>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcDefelskoBatch[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { category: "ASC", fieldKey: "ASC" },
    });
  }

  findByJobCardAndFieldKey(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<QcDefelskoBatch | null> {
    return this.repository.findOne({
      where: { companyId, jobCardId, fieldKey },
    });
  }

  async matchActiveByBatchNumber(
    companyId: number,
    batchNumber: string,
  ): Promise<DefelskoBatchMatch | null> {
    const match = await this.repository
      .createQueryBuilder("db")
      .leftJoin(JobCard, "jc", "jc.id = db.jobCardId")
      .addSelect("jc.jobNumber", "jobNumber")
      .addSelect("jc.jcNumber", "jcNumber")
      .where("db.companyId = :companyId", { companyId })
      .andWhere("LOWER(TRIM(db.batchNumber)) = LOWER(TRIM(:batchName))", {
        batchName: batchNumber.trim(),
      })
      .andWhere("db.notApplicable = false")
      .getRawAndEntities();

    if (match.entities.length === 0) {
      return null;
    }

    return {
      batch: match.entities[0],
      jobNumber: match.raw[0]?.jc_job_number || null,
      jcNumber: match.raw[0]?.jc_jc_number || null,
    };
  }

  findForJobCardWithCertLinked(companyId: number, jobCardId: number): Promise<QcDefelskoBatch[]> {
    return this.repository.find({
      where: {
        companyId,
        jobCardId,
        supplierCertificateId: Not(IsNull()) as unknown as number,
      },
      relations: [
        "supplierCertificate",
        "supplierCertificate.supplier",
        "supplierCertificate.stockItem",
      ],
    });
  }

  findUnlinkedByCategories(companyId: number, categories: string[]): Promise<QcDefelskoBatch[]> {
    return this.repository.find({
      where: {
        companyId,
        supplierCertificateId: IsNull() as unknown as number,
        category: In(categories),
      },
    });
  }

  async updateSupplierCertificateId(id: number, supplierCertificateId: number): Promise<void> {
    await this.repository.update(id, { supplierCertificateId });
  }
}
