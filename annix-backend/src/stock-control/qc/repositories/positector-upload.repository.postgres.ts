import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { PositectorUpload } from "../entities/positector-upload.entity";
import { PositectorUploadRepository } from "./positector-upload.repository";

@Injectable()
export class PostgresPositectorUploadRepository
  extends TypeOrmCrudRepository<PositectorUpload>
  implements PositectorUploadRepository
{
  constructor(@InjectRepository(PositectorUpload) repository: Repository<PositectorUpload>) {
    super(repository);
  }

  findMissingMeasurementDate(): Promise<PositectorUpload[]> {
    return this.repository.createQueryBuilder("u").where("u.measurementDate IS NULL").getMany();
  }

  findBundleNamed(): Promise<PositectorUpload[]> {
    return this.repository
      .createQueryBuilder("u")
      .where("u.batchName LIKE :prefix", { prefix: "bundle_%" })
      .getMany();
  }

  findBundleNamedForCompany(companyId: number): Promise<PositectorUpload[]> {
    return this.repository
      .createQueryBuilder("u")
      .where("u.companyId = :companyId", { companyId })
      .andWhere("u.batchName LIKE :prefix", { prefix: "bundle_%" })
      .getMany();
  }

  async updateById(id: number, updates: Partial<PositectorUpload>): Promise<void> {
    await this.repository.update(id, updates);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<PositectorUpload[]> {
    return this.repository.find({
      where: { companyId, linkedJobCardId: jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  findByFingerprint(companyId: number, fingerprint: string): Promise<PositectorUpload | null> {
    return this.repository.findOne({
      where: { companyId, fingerprint },
    });
  }

  findAllForCompany(companyId: number): Promise<PositectorUpload[]> {
    return this.repository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<PositectorUpload | null> {
    return this.repository.findOne({ where: { companyId, id } });
  }

  findUnlinkedForCompany(
    companyId: number,
    entityType: string | undefined,
  ): Promise<PositectorUpload[]> {
    const qb = this.repository
      .createQueryBuilder("u")
      .where("u.companyId = :companyId", { companyId })
      .andWhere("u.linkedJobCardId IS NULL")
      .orderBy("u.createdAt", "DESC");

    if (entityType) {
      qb.andWhere("u.entityType = :entityType", { entityType });
    }

    return qb.getMany();
  }

  findUnlinkedByBatchName(companyId: number, batchName: string): Promise<PositectorUpload[]> {
    return this.repository
      .createQueryBuilder("u")
      .where("u.companyId = :companyId", { companyId })
      .andWhere("u.linkedJobCardId IS NULL")
      .andWhere("LOWER(TRIM(u.batchName)) = LOWER(TRIM(:batchNumber))", {
        batchNumber: batchName.trim(),
      })
      .getMany();
  }

  findUnlinkedEnvironmentalInRange(
    companyId: number,
    earliestDate: string,
    latestDate: string,
  ): Promise<PositectorUpload[]> {
    return this.repository.find({
      where: {
        companyId,
        entityType: "environmental",
        linkedJobCardId: IsNull(),
        measurementDate: Between(earliestDate, latestDate),
      },
    });
  }

  findLinkedToJobCard(companyId: number, jobCardId: number): Promise<PositectorUpload[]> {
    return this.repository.find({
      where: { linkedJobCardId: jobCardId, companyId },
    });
  }
}
