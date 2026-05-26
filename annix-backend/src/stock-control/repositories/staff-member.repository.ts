import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StaffMember } from "../entities/staff-member.entity";

export interface StaffSearchRow {
  id: number;
  name: string;
  employeeNumber: string | null;
  department: string | null;
  active: boolean;
  updatedAt: Date;
}

export abstract class StaffMemberRepository extends CrudRepository<StaffMember> {
  abstract findAllForCompanyOrdered(
    companyId: number,
    filters?: { search?: string; active?: string },
  ): Promise<StaffMember[]>;
  abstract findActiveForCompanyOrdered(companyId: number): Promise<StaffMember[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StaffMember | null>;
  abstract findActiveByIdForUnifiedCompany(
    id: number,
    unifiedCompanyId: number,
  ): Promise<StaffMember | null>;
  abstract searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<StaffSearchRow[]>;
}
