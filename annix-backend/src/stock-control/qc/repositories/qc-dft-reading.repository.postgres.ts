import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { JobCard } from "../../entities/job-card.entity";
import { DftCoatType, QcDftReading } from "../entities/qc-dft-reading.entity";
import { QcDftReadingRepository, type QcDftReadingWithJob } from "./qc-dft-reading.repository";

@Injectable()
export class PostgresQcDftReadingRepository
  extends TypeOrmCrudRepository<QcDftReading>
  implements QcDftReadingRepository
{
  constructor(@InjectRepository(QcDftReading) repository: Repository<QcDftReading>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcDftReading[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDftReading[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "ASC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcDftReading | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  countForJobCardCoatOnDate(
    companyId: number,
    jobCardId: number,
    coatType: DftCoatType,
    readingDate: string,
  ): Promise<number> {
    return this.repository
      .createQueryBuilder("d")
      .where("d.companyId = :companyId", { companyId })
      .andWhere("d.jobCardId = :jobCardId", { jobCardId })
      .andWhere("d.coatType = :coatType", { coatType })
      .andWhere("d.readingDate = :today", { today: readingDate })
      .getCount();
  }

  async findAllWithJobInfo(companyId: number): Promise<QcDftReadingWithJob[]> {
    const records = await this.repository
      .createQueryBuilder("dft")
      .leftJoin(JobCard, "jc", "jc.id = dft.jobCardId")
      .addSelect("jc.jobNumber", "jobNumber")
      .addSelect("jc.jcNumber", "jcNumber")
      .where("dft.companyId = :companyId", { companyId })
      .orderBy("dft.readingDate", "DESC")
      .addOrderBy("dft.createdAt", "DESC")
      .getRawAndEntities();

    return records.entities.map((entity, idx) => ({
      ...entity,
      jobNumber: records.raw[idx]?.jc_job_number || null,
      jcNumber: records.raw[idx]?.jc_jc_number || null,
    }));
  }
}
