import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { JobCard } from "../../entities/job-card.entity";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";
import {
  QcShoreHardnessRepository,
  type QcShoreHardnessWithJob,
} from "./qc-shore-hardness.repository";

@Injectable()
export class PostgresQcShoreHardnessRepository
  extends TypeOrmCrudRepository<QcShoreHardness>
  implements QcShoreHardnessRepository
{
  constructor(@InjectRepository(QcShoreHardness) repository: Repository<QcShoreHardness>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcShoreHardness[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcShoreHardness[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "ASC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcShoreHardness | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  countForJobCardOnDate(
    companyId: number,
    jobCardId: number,
    readingDate: string,
  ): Promise<number> {
    return this.repository
      .createQueryBuilder("s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("s.jobCardId = :jobCardId", { jobCardId })
      .andWhere("s.readingDate = :today", { today: readingDate })
      .getCount();
  }

  async findAllWithJobInfo(companyId: number): Promise<QcShoreHardnessWithJob[]> {
    const records = await this.repository
      .createQueryBuilder("sh")
      .leftJoin(JobCard, "jc", "jc.id = sh.jobCardId")
      .addSelect("jc.jobNumber", "jobNumber")
      .addSelect("jc.jcNumber", "jcNumber")
      .where("sh.companyId = :companyId", { companyId })
      .orderBy("sh.readingDate", "DESC")
      .addOrderBy("sh.createdAt", "DESC")
      .getRawAndEntities();

    return records.entities.map((entity, idx) => ({
      ...entity,
      jobNumber: records.raw[idx]?.jc_job_number || null,
      jcNumber: records.raw[idx]?.jc_jc_number || null,
    }));
  }
}
