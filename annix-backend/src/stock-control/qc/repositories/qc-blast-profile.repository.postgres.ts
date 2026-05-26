import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { JobCard } from "../../entities/job-card.entity";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import {
  QcBlastProfileRepository,
  type QcBlastProfileWithJob,
} from "./qc-blast-profile.repository";

@Injectable()
export class PostgresQcBlastProfileRepository
  extends TypeOrmCrudRepository<QcBlastProfile>
  implements QcBlastProfileRepository
{
  constructor(@InjectRepository(QcBlastProfile) repository: Repository<QcBlastProfile>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcBlastProfile[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcBlastProfile[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "ASC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcBlastProfile | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  countForJobCardOnDate(
    companyId: number,
    jobCardId: number,
    readingDate: string,
  ): Promise<number> {
    return this.repository
      .createQueryBuilder("b")
      .where("b.companyId = :companyId", { companyId })
      .andWhere("b.jobCardId = :jobCardId", { jobCardId })
      .andWhere("b.readingDate = :today", { today: readingDate })
      .getCount();
  }

  async findAllWithJobInfo(companyId: number): Promise<QcBlastProfileWithJob[]> {
    const records = await this.repository
      .createQueryBuilder("bp")
      .leftJoin(JobCard, "jc", "jc.id = bp.jobCardId")
      .addSelect("jc.jobNumber", "jobNumber")
      .addSelect("jc.jcNumber", "jcNumber")
      .where("bp.companyId = :companyId", { companyId })
      .orderBy("bp.readingDate", "DESC")
      .addOrderBy("bp.createdAt", "DESC")
      .getRawAndEntities();

    return records.entities.map((entity, idx) => ({
      ...entity,
      jobNumber: records.raw[idx]?.jc_job_number || null,
      jcNumber: records.raw[idx]?.jc_jc_number || null,
    }));
  }
}
