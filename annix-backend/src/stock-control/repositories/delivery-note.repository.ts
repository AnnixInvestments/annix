import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DeliveryNote } from "../entities/delivery-note.entity";

export interface DeliveryNoteAutoLinkRow {
  id: number;
  deliveryNumber: string;
  supplierName: string;
  receivedDate: Date | null;
}

export interface DeliveryNoteSearchRow {
  id: number;
  deliveryNumber: string;
  supplierName: string;
  notes: string | null;
  createdAt: Date;
}

export abstract class DeliveryNoteRepository extends CrudRepository<DeliveryNote> {
  abstract withTransaction(context: TransactionContext): CrudRepository<DeliveryNote>;
  abstract findOneByNumber(companyId: number, deliveryNumber: string): Promise<DeliveryNote | null>;
  abstract findOneForCompany(id: number, companyId: number): Promise<DeliveryNote | null>;
  abstract findOneForCompanyWithItems(id: number, companyId: number): Promise<DeliveryNote | null>;
  abstract findPaginatedWithItems(
    companyId: number,
    page: number,
    limit: number,
  ): Promise<DeliveryNote[]>;
  abstract findAllForCompanyByReceivedDate(companyId: number): Promise<DeliveryNote[]>;
  abstract findAutoLinkCandidates(companyId: number): Promise<DeliveryNoteAutoLinkRow[]>;
  abstract countPendingExtraction(companyId: number): Promise<number>;
  abstract countCompletedExtraction(companyId: number): Promise<number>;
  abstract countCreatedSince(companyId: number, since: Date): Promise<number>;
  abstract searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<DeliveryNoteSearchRow[]>;
}
