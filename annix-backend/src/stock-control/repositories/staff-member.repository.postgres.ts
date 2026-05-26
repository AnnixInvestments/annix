import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StaffMember } from "../entities/staff-member.entity";
import { StaffMemberRepository, type StaffSearchRow } from "./staff-member.repository";

@Injectable()
export class PostgresStaffMemberRepository
  extends TypeOrmCrudRepository<StaffMember>
  implements StaffMemberRepository
{
  constructor(@InjectRepository(StaffMember) repository: Repository<StaffMember>) {
    super(repository);
  }

  findAllForCompanyOrdered(
    companyId: number,
    filters?: { search?: string; active?: string },
  ): Promise<StaffMember[]> {
    const where: Record<string, unknown>[] = [];

    const baseWhere: Record<string, unknown> = { companyId };

    if (filters?.active === "true") {
      baseWhere.active = true;
    } else if (filters?.active === "false") {
      baseWhere.active = false;
    }

    if (filters?.search) {
      const pattern = ILike(`%${filters.search}%`);
      where.push(
        { ...baseWhere, name: pattern },
        { ...baseWhere, employeeNumber: pattern },
        { ...baseWhere, department: pattern },
      );
    } else {
      where.push(baseWhere);
    }

    return this.repository.find({
      where,
      order: { name: "ASC" },
    });
  }

  findActiveForCompanyOrdered(companyId: number): Promise<StaffMember[]> {
    return this.repository.find({
      where: { companyId, active: true },
      order: { name: "ASC" },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<StaffMember | null> {
    return this.repository.findOne({
      where: { id, companyId },
    });
  }

  findActiveByIdForUnifiedCompany(
    id: number,
    unifiedCompanyId: number,
  ): Promise<StaffMember | null> {
    return this.repository.findOne({
      where: { id, unifiedCompanyId, active: true } as never,
    });
  }

  async searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<StaffSearchRow[]> {
    return this.repository
      .createQueryBuilder("s")
      .select(["s.id", "s.name", "s.employeeNumber", "s.department", "s.active", "s.updatedAt"])
      .where("s.companyId = :companyId", { companyId })
      .andWhere(
        "(s.name ILIKE :pattern OR s.employeeNumber ILIKE :pattern OR s.department ILIKE :pattern)",
        { pattern },
      )
      .orderBy("s.updatedAt", "DESC")
      .take(limit)
      .getMany();
  }
}
