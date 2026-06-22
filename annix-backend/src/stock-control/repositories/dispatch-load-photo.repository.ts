import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DispatchLoadPhoto } from "../entities/dispatch-load-photo.entity";

export abstract class DispatchLoadPhotoRepository extends TenantScopedRepository<DispatchLoadPhoto> {
  abstract withTransaction(context: TransactionContext): DispatchLoadPhotoRepository;
  abstract saveForCompany(companyId: number, entity: DispatchLoadPhoto): Promise<DispatchLoadPhoto>;
  abstract removeForCompany(companyId: number, entity: DispatchLoadPhoto): Promise<void>;
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<DispatchLoadPhoto[]>;
  abstract findOneForCompany(photoId: number, companyId: number): Promise<DispatchLoadPhoto | null>;
}
