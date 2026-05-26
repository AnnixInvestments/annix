import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { IssuanceRow } from "../entities/issuance-row.entity";
import {
  type CoatingAnalysisRow,
  type CpoCoatTrackingRow,
  type CpoIssuedTotalRow,
  type CpoJobCardIdRow,
  type CpoPaintRow,
  type CpoPaintSplitRow,
  IssuanceRowRepository,
  type JobCardLineItemRow,
} from "./issuance-row.repository";

@Injectable()
export class PostgresIssuanceRowRepository
  extends TypeOrmCrudRepository<IssuanceRow>
  implements IssuanceRowRepository
{
  constructor(@InjectRepository(IssuanceRow) repository: Repository<IssuanceRow>) {
    super(repository);
  }

  build(data: DeepPartial<IssuanceRow>): IssuanceRow {
    return this.repository.create(data as TypeOrmDeepPartial<IssuanceRow>);
  }

  withTransaction(context: TransactionContext): PostgresIssuanceRowRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresIssuanceRowRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresIssuanceRowRepository(context.manager.getRepository(IssuanceRow));
  }

  issuedTotalsForCpo(companyId: number, cpoId: number): Promise<CpoIssuedTotalRow[]> {
    return this.repository.manager.query(
      `SELECT ir.product_id, ip.name AS product_name, ir.row_type,
              COALESCE(SUM(pir.litres), 0) + COALESCE(SUM(cir.quantity), 0)
              + COALESCE(SUM(rr.weight_kg_issued), 0) + COALESCE(SUM(sol.volume_l), 0)
              AS total_issued
       FROM sm_issuance_row ir
       JOIN sm_issuance_session s ON s.id = ir.session_id
       JOIN sm_issuable_product ip ON ip.id = ir.product_id
       LEFT JOIN sm_paint_issuance_row pir ON pir.row_id = ir.id
       LEFT JOIN sm_consumable_issuance_row cir ON cir.row_id = ir.id
       LEFT JOIN sm_rubber_roll_issuance_row rr ON rr.row_id = ir.id
       LEFT JOIN sm_solution_issuance_row sol ON sol.row_id = ir.id
       WHERE s.company_id = $1 AND s.cpo_id = $2 AND s.status != 'undone'
         AND ir.undone = false
       GROUP BY ir.product_id, ip.name, ir.row_type`,
      [companyId, cpoId],
    );
  }

  paintSplitsForCpo(companyId: number, cpoId: number): Promise<CpoPaintSplitRow[]> {
    return this.repository.manager.query(
      `SELECT ir.product_id, pir.cpo_pro_rata_split
       FROM sm_paint_issuance_row pir
       JOIN sm_issuance_row ir ON ir.id = pir.row_id
       JOIN sm_issuance_session s ON s.id = ir.session_id
       WHERE s.company_id = $1 AND s.cpo_id = $2 AND s.status != 'undone'
         AND ir.undone = false
         AND pir.cpo_pro_rata_split IS NOT NULL`,
      [companyId, cpoId],
    );
  }

  coatTrackingForCpo(companyId: number, cpoId: number): Promise<CpoCoatTrackingRow[]> {
    return this.repository.manager.query(
      `SELECT ict.line_item_id, ict.job_card_id, ict.coat_type,
              SUM(ict.quantity_issued)::integer AS total_quantity_issued
       FROM sm_issuance_item_coat_tracking ict
       JOIN sm_issuance_row ir ON ir.id = ict.issuance_row_id
       JOIN sm_issuance_session s ON s.id = ir.session_id
       WHERE ict.company_id = $1
         AND s.cpo_id = $2
         AND s.status != 'undone'
         AND ir.undone = false
       GROUP BY ict.line_item_id, ict.job_card_id, ict.coat_type`,
      [companyId, cpoId],
    );
  }

  paintRowsForCpo(companyId: number, cpoId: number): Promise<CpoPaintRow[]> {
    return this.repository.manager.query(
      `SELECT ip.name AS product_name,
              COALESCE(SUM(pir.litres), 0) AS total_litres,
              s.job_card_ids
       FROM sm_issuance_row ir
       JOIN sm_issuance_session s ON s.id = ir.session_id
       JOIN sm_issuable_product ip ON ip.id = ir.product_id
       JOIN sm_paint_issuance_row pir ON pir.row_id = ir.id
       WHERE s.company_id = $1
         AND s.cpo_id = $2
         AND s.status != 'undone'
         AND ir.undone = false
         AND ir.row_type = 'paint'
       GROUP BY ip.name, s.job_card_ids`,
      [companyId, cpoId],
    );
  }

  jobCardIdsForCpo(companyId: number, cpoId: number): Promise<CpoJobCardIdRow[]> {
    return this.repository.manager.query(
      `SELECT DISTINCT jc.id AS job_card_id
       FROM customer_purchase_orders cpo
       JOIN job_cards jc ON jc.cpo_id = cpo.id
       WHERE cpo.id = $1 AND cpo.company_id = $2`,
      [cpoId, companyId],
    );
  }

  coatingAnalysesForJobCards(
    companyId: number,
    jobCardIds: number[],
  ): Promise<CoatingAnalysisRow[]> {
    return this.repository.manager.query(
      `SELECT ca.job_card_id, ca.coats
       FROM job_card_coating_analyses ca
       WHERE ca.company_id = $1
         AND ca.job_card_id = ANY($2)`,
      [companyId, jobCardIds],
    );
  }

  lineItemsForJobCards(jobCardIds: number[]): Promise<JobCardLineItemRow[]> {
    return this.repository.manager.query(
      `SELECT li.id, li.job_card_id, li.quantity, li.m2
       FROM job_card_line_items li
       WHERE li.job_card_id = ANY($1)`,
      [jobCardIds],
    );
  }
}
