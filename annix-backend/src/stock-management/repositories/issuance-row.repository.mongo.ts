import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
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
export class MongoIssuanceRowRepository
  extends MongoCrudRepository<IssuanceRow>
  implements IssuanceRowRepository
{
  constructor(
    @InjectModel("IssuanceRow") model: Model<IssuanceRow>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<IssuanceRow>): IssuanceRow {
    return data as IssuanceRow;
  }

  withTransaction(context: TransactionContext): MongoIssuanceRowRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoIssuanceRowRepository requires a MongoTransactionContext");
    }
    return new MongoIssuanceRowRepository(this.model, context.session);
  }

  async issuedTotalsForCpo(companyId: number, cpoId: number): Promise<CpoIssuedTotalRow[]> {
    const rows = await this.documents
      .aggregate<{
        _id: { productId: number; productName: string; rowType: string };
        totalIssued: number;
      }>([
        {
          $lookup: {
            from: "sm_issuance_session",
            localField: "sessionId",
            foreignField: "_id",
            as: "session",
          },
        },
        { $unwind: "$session" },
        {
          $match: {
            "session.companyId": companyId,
            "session.cpoId": cpoId,
            "session.status": { $ne: "undone" },
            undone: false,
          },
        },
        {
          $lookup: {
            from: "sm_issuable_product",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $lookup: {
            from: "sm_paint_issuance_row",
            localField: "_id",
            foreignField: "rowId",
            as: "paint",
          },
        },
        {
          $lookup: {
            from: "sm_consumable_issuance_row",
            localField: "_id",
            foreignField: "rowId",
            as: "consumable",
          },
        },
        {
          $lookup: {
            from: "sm_rubber_roll_issuance_row",
            localField: "_id",
            foreignField: "rowId",
            as: "rubber",
          },
        },
        {
          $lookup: {
            from: "sm_solution_issuance_row",
            localField: "_id",
            foreignField: "rowId",
            as: "solution",
          },
        },
        {
          $group: {
            _id: {
              productId: "$productId",
              productName: "$product.name",
              rowType: "$rowType",
            },
            totalIssued: {
              $sum: {
                $add: [
                  { $sum: "$paint.litres" },
                  { $sum: "$consumable.quantity" },
                  { $sum: "$rubber.weightKgIssued" },
                  { $sum: "$solution.volumeL" },
                ],
              },
            },
          },
        },
      ])
      .exec();
    return rows.map((row) => ({
      product_id: row._id.productId,
      product_name: row._id.productName,
      row_type: row._id.rowType,
      total_issued: row.totalIssued,
    }));
  }

  async paintSplitsForCpo(companyId: number, cpoId: number): Promise<CpoPaintSplitRow[]> {
    const rows = await this.model.db
      .collection("sm_paint_issuance_row")
      .aggregate<{ productId: number; cpoProRataSplit: Record<string, number> | null }>([
        {
          $lookup: {
            from: "sm_issuance_row",
            localField: "rowId",
            foreignField: "_id",
            as: "row",
          },
        },
        { $unwind: "$row" },
        {
          $lookup: {
            from: "sm_issuance_session",
            localField: "row.sessionId",
            foreignField: "_id",
            as: "session",
          },
        },
        { $unwind: "$session" },
        {
          $match: {
            "session.companyId": companyId,
            "session.cpoId": cpoId,
            "session.status": { $ne: "undone" },
            "row.undone": false,
            cpoProRataSplit: { $ne: null },
          },
        },
        { $project: { productId: "$row.productId", cpoProRataSplit: 1 } },
      ])
      .toArray();
    return rows.map((row) => ({
      product_id: row.productId,
      cpo_pro_rata_split: row.cpoProRataSplit,
    }));
  }

  async coatTrackingForCpo(companyId: number, cpoId: number): Promise<CpoCoatTrackingRow[]> {
    const rows = await this.model.db
      .collection("sm_issuance_item_coat_tracking")
      .aggregate<{
        _id: { lineItemId: number; jobCardId: number; coatType: string };
        totalQuantityIssued: number;
      }>([
        {
          $lookup: {
            from: "sm_issuance_row",
            localField: "issuanceRowId",
            foreignField: "_id",
            as: "row",
          },
        },
        { $unwind: "$row" },
        {
          $lookup: {
            from: "sm_issuance_session",
            localField: "row.sessionId",
            foreignField: "_id",
            as: "session",
          },
        },
        { $unwind: "$session" },
        {
          $match: {
            companyId,
            "session.cpoId": cpoId,
            "session.status": { $ne: "undone" },
            "row.undone": false,
          },
        },
        {
          $group: {
            _id: {
              lineItemId: "$lineItemId",
              jobCardId: "$jobCardId",
              coatType: "$coatType",
            },
            totalQuantityIssued: { $sum: "$quantityIssued" },
          },
        },
      ])
      .toArray();
    return rows.map((row) => ({
      line_item_id: row._id.lineItemId,
      job_card_id: row._id.jobCardId,
      coat_type: row._id.coatType,
      total_quantity_issued: Number(row.totalQuantityIssued),
    }));
  }

  async paintRowsForCpo(companyId: number, cpoId: number): Promise<CpoPaintRow[]> {
    const rows = await this.documents
      .aggregate<{
        _id: { productName: string; jobCardIds: unknown };
        totalLitres: number;
      }>([
        {
          $lookup: {
            from: "sm_issuance_session",
            localField: "sessionId",
            foreignField: "_id",
            as: "session",
          },
        },
        { $unwind: "$session" },
        {
          $match: {
            "session.companyId": companyId,
            "session.cpoId": cpoId,
            "session.status": { $ne: "undone" },
            undone: false,
            rowType: "paint",
          },
        },
        {
          $lookup: {
            from: "sm_issuable_product",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $lookup: {
            from: "sm_paint_issuance_row",
            localField: "_id",
            foreignField: "rowId",
            as: "paint",
          },
        },
        {
          $group: {
            _id: { productName: "$product.name", jobCardIds: "$session.jobCardIds" },
            totalLitres: { $sum: { $sum: "$paint.litres" } },
          },
        },
      ])
      .exec();
    return rows.map((row) => ({
      product_name: row._id.productName,
      total_litres: row.totalLitres,
      job_card_ids: row._id.jobCardIds,
    }));
  }

  async jobCardIdsForCpo(companyId: number, cpoId: number): Promise<CpoJobCardIdRow[]> {
    const rows = await this.model.db
      .collection("job_cards")
      .find({ cpoId, companyId })
      .project<{ _id: number }>({ _id: 1 })
      .toArray();
    return rows.map((row) => ({ job_card_id: Number(row._id) }));
  }

  async coatingAnalysesForJobCards(
    companyId: number,
    jobCardIds: number[],
  ): Promise<CoatingAnalysisRow[]> {
    const rows = await this.model.db
      .collection("job_card_coating_analyses")
      .find({ companyId, jobCardId: { $in: jobCardIds } })
      .toArray();
    return rows.map((row) => ({
      job_card_id: Number(row.jobCardId),
      coats: row.coats as CoatingAnalysisRow["coats"],
    }));
  }

  async lineItemsForJobCards(jobCardIds: number[]): Promise<JobCardLineItemRow[]> {
    const rows = await this.model.db
      .collection("job_card_line_items")
      .find({ jobCardId: { $in: jobCardIds } })
      .toArray();
    return rows.map((row) => ({
      id: Number(row._id),
      job_card_id: Number(row.jobCardId),
      quantity: row.quantity == null ? null : Number(row.quantity),
      m2: row.m2 == null ? null : Number(row.m2),
    }));
  }
}
