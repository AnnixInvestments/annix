import { CrudRepository } from "../lib/persistence/crud-repository";
import { SupplierInvitation } from "./entities/supplier-invitation.entity";

export abstract class SupplierInvitationRepository extends CrudRepository<SupplierInvitation> {
  abstract findByCompany(customerCompanyId: number): Promise<SupplierInvitation[]>;
  abstract findActivePendingByCompanyAndEmail(
    customerCompanyId: number,
    email: string,
    nowDate: Date,
  ): Promise<SupplierInvitation | null>;
  abstract findByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<SupplierInvitation | null>;
  abstract findActivePendingByToken(
    token: string,
    nowDate: Date,
  ): Promise<SupplierInvitation | null>;
  abstract findByToken(token: string): Promise<SupplierInvitation | null>;
  abstract findPendingByEmail(email: string): Promise<SupplierInvitation[]>;
}
