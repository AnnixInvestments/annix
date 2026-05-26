import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { AuCocStatus, RubberAuCoc } from "../entities/rubber-au-coc.entity";

export interface AuCocListFilters {
  status?: AuCocStatus;
  customerCompanyId?: number;
}

export interface AuCocWithItemCount {
  coc: RubberAuCoc;
  linkedItemCount: number;
}

export interface AuCocDeliveryNoteRef {
  id: number;
  cocNumber: string;
  sourceDeliveryNoteId: number | null;
}

export abstract class RubberAuCocRepository extends CrudRepository<RubberAuCoc> {
  abstract build(data: Partial<RubberAuCoc>): RubberAuCoc;
  abstract saveMany(entities: RubberAuCoc[]): Promise<RubberAuCoc[]>;
  abstract updateById(id: number, updates: DeepPartial<RubberAuCoc>): Promise<void>;
  abstract deleteById(id: number): Promise<boolean>;
  abstract findWithItemCounts(filters?: AuCocListFilters): Promise<AuCocWithItemCount[]>;
  abstract findByStatusesOrderedById(statuses: AuCocStatus[]): Promise<RubberAuCoc[]>;
  abstract findByIdsOrderedById(ids: number[]): Promise<RubberAuCoc[]>;
  abstract findByIdsWithCustomerOrderedById(ids: number[]): Promise<RubberAuCoc[]>;
  abstract findByStatusWithCustomerOrderedByCocNumber(status: AuCocStatus): Promise<RubberAuCoc[]>;
  abstract findByStatus(status: AuCocStatus): Promise<RubberAuCoc[]>;
  abstract findRefsByDeliveryNoteIds(dnIds: number[]): Promise<AuCocDeliveryNoteRef[]>;
  abstract nextCocSequence(): Promise<number>;
}
