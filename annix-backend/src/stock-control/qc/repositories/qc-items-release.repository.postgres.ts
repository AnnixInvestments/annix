import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcItemsRelease } from "../entities/qc-items-release.entity";
import { QcItemsReleaseRepository } from "./qc-items-release.repository";

@Injectable()
export class PostgresQcItemsReleaseRepository
  extends TypeOrmCrudRepository<QcItemsRelease>
  implements QcItemsReleaseRepository
{
  constructor(@InjectRepository(QcItemsRelease) repository: Repository<QcItemsRelease>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcItemsRelease[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcItemsRelease[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { createdAt: "ASC" },
    });
  }

  findForCpo(companyId: number, cpoId: number): Promise<QcItemsRelease[]> {
    return this.repository.find({
      where: { companyId, cpoId },
      order: { createdAt: "DESC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcItemsRelease | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findAllForJobCard(jobCardId: number, companyId: number): Promise<QcItemsRelease[]> {
    return this.repository.find({ where: { jobCardId, companyId } });
  }

  async removeMany(entities: QcItemsRelease[]): Promise<void> {
    await this.repository.remove(entities);
  }

  findChildReleasesInWindow(
    companyId: number,
    windowStart: Date,
    windowEnd: Date,
    createdById: number | null,
  ): Promise<QcItemsRelease[]> {
    return this.repository
      .createQueryBuilder("r")
      .where("r.companyId = :companyId", { companyId })
      .andWhere("r.cpoId IS NULL")
      .andWhere("r.jobCardId IS NOT NULL")
      .andWhere("r.createdAt BETWEEN :start AND :end", {
        start: windowStart,
        end: windowEnd,
      })
      .andWhere("r.createdById = :createdById", { createdById })
      .getMany();
  }
}
