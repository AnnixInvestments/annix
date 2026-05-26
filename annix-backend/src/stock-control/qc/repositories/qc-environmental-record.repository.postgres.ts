import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { JobCard } from "../../entities/job-card.entity";
import { QcEnvironmentalRecord } from "../entities/qc-environmental-record.entity";
import {
  QcEnvironmentalRecordRepository,
  type QcEnvironmentalRecordWithJob,
} from "./qc-environmental-record.repository";

@Injectable()
export class PostgresQcEnvironmentalRecordRepository
  extends TypeOrmCrudRepository<QcEnvironmentalRecord>
  implements QcEnvironmentalRecordRepository
{
  constructor(
    @InjectRepository(QcEnvironmentalRecord) repository: Repository<QcEnvironmentalRecord>,
  ) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcEnvironmentalRecord[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
    });
  }

  findForJobCardOrdered(companyId: number, jobCardId: number): Promise<QcEnvironmentalRecord[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { recordDate: "DESC", createdAt: "DESC" },
    });
  }

  findForJobCardInRange(
    companyId: number,
    jobCardId: number,
    startDate: string,
    endDate: string,
  ): Promise<QcEnvironmentalRecord[]> {
    return this.repository.find({
      where: {
        companyId,
        jobCardId,
        recordDate: Between(startDate, endDate),
      },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcEnvironmentalRecord | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByJobCardAndDate(
    companyId: number,
    jobCardId: number,
    recordDate: string | undefined,
  ): Promise<QcEnvironmentalRecord | null> {
    return this.repository.findOne({
      where: { companyId, jobCardId, recordDate },
    });
  }

  countForJobCardOnDate(companyId: number, jobCardId: number, recordDate: string): Promise<number> {
    return this.repository
      .createQueryBuilder("e")
      .where("e.companyId = :companyId", { companyId })
      .andWhere("e.jobCardId = :jobCardId", { jobCardId })
      .andWhere("e.recordDate = :recordDate", { recordDate })
      .getCount();
  }

  async findAllWithJobInfo(companyId: number): Promise<QcEnvironmentalRecordWithJob[]> {
    const records = await this.repository
      .createQueryBuilder("env")
      .leftJoin(JobCard, "jc", "jc.id = env.jobCardId")
      .addSelect("jc.jobNumber", "jobNumber")
      .addSelect("jc.jcNumber", "jcNumber")
      .where("env.companyId = :companyId", { companyId })
      .orderBy("env.recordDate", "DESC")
      .addOrderBy("env.createdAt", "DESC")
      .getRawAndEntities();

    return records.entities.map((entity, idx) => ({
      ...entity,
      jobNumber: records.raw[idx]?.jc_job_number || null,
      jcNumber: records.raw[idx]?.jc_jc_number || null,
    }));
  }
}
