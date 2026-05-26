import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcControlPlan } from "../entities/qc-control-plan.entity";
import { QcControlPlanRepository } from "./qc-control-plan.repository";

@Injectable()
export class PostgresQcControlPlanRepository
  extends TypeOrmCrudRepository<QcControlPlan>
  implements QcControlPlanRepository
{
  constructor(@InjectRepository(QcControlPlan) repository: Repository<QcControlPlan>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcControlPlan[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  findForJobCardUnordered(companyId: number, jobCardId: number): Promise<QcControlPlan[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
    });
  }

  findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcControlPlan[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { createdAt: "ASC" },
    });
  }

  findForCpo(companyId: number, cpoId: number): Promise<QcControlPlan[]> {
    return this.repository.find({
      where: { companyId, cpoId },
      order: { createdAt: "DESC" },
    });
  }

  findCpoLevelForCpo(companyId: number, cpoId: number): Promise<QcControlPlan[]> {
    return this.repository.find({
      where: { companyId, cpoId, jobCardId: IsNull() },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcControlPlan | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  search(companyId: number, search: string | null): Promise<QcControlPlan[]> {
    const qb = this.repository
      .createQueryBuilder("qcp")
      .where("qcp.company_id = :companyId", { companyId })
      .orderBy("qcp.created_at", "DESC");

    if (search) {
      qb.andWhere("(qcp.qcp_number ILIKE :search OR qcp.job_number ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    return qb.getMany();
  }

  async latestQcpNumberWithPrefix(companyId: number, prefix: string): Promise<string | null> {
    const result = await this.repository
      .createQueryBuilder("qcp")
      .select("qcp.qcp_number", "qcpNumber")
      .where("qcp.company_id = :companyId", { companyId })
      .andWhere("qcp.qcp_number LIKE :prefix", { prefix: `${prefix}%` })
      .orderBy("qcp.qcp_number", "DESC")
      .limit(1)
      .getRawOne();

    return result?.qcpNumber ?? null;
  }

  async updateById(id: number, updates: Partial<QcControlPlan>): Promise<void> {
    await this.repository.update(id, updates);
  }
}
