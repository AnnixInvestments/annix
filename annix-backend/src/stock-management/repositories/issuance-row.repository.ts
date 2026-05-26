import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { IssuanceRow } from "../entities/issuance-row.entity";

export interface CpoIssuedTotalRow {
  product_id: number;
  product_name: string;
  row_type: string;
  total_issued: string | number;
}

export interface CpoPaintSplitRow {
  product_id: number;
  cpo_pro_rata_split: Record<string, number> | null;
}

export interface CpoCoatTrackingRow {
  line_item_id: number;
  job_card_id: number;
  coat_type: string;
  total_quantity_issued: number;
}

export interface CpoPaintRow {
  product_name: string;
  total_litres: string | number;
  job_card_ids: unknown;
}

export interface CpoJobCardIdRow {
  job_card_id: number;
}

export interface CoatingAnalysisRow {
  job_card_id: number;
  coats: Array<{
    product: string;
    coatRole?: string;
    area: string;
    coverageM2PerLiter: number;
    litersRequired: number;
  }>;
}

export interface JobCardLineItemRow {
  id: number;
  job_card_id: number;
  quantity: number | null;
  m2: number | null;
}

export abstract class IssuanceRowRepository extends CrudRepository<IssuanceRow> {
  abstract build(data: DeepPartial<IssuanceRow>): IssuanceRow;
  abstract withTransaction(context: TransactionContext): IssuanceRowRepository;
  abstract issuedTotalsForCpo(companyId: number, cpoId: number): Promise<CpoIssuedTotalRow[]>;
  abstract paintSplitsForCpo(companyId: number, cpoId: number): Promise<CpoPaintSplitRow[]>;
  abstract coatTrackingForCpo(companyId: number, cpoId: number): Promise<CpoCoatTrackingRow[]>;
  abstract paintRowsForCpo(companyId: number, cpoId: number): Promise<CpoPaintRow[]>;
  abstract jobCardIdsForCpo(companyId: number, cpoId: number): Promise<CpoJobCardIdRow[]>;
  abstract coatingAnalysesForJobCards(
    companyId: number,
    jobCardIds: number[],
  ): Promise<CoatingAnalysisRow[]>;
  abstract lineItemsForJobCards(jobCardIds: number[]): Promise<JobCardLineItemRow[]>;
}
