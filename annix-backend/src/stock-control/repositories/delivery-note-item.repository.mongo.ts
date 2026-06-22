import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { DeliveryNoteItemRepository } from "./delivery-note-item.repository";

function toDocumentShape(row: DeepPartial<DeliveryNoteItem>): Record<string, unknown> {
  const source = row as Record<string, unknown>;
  const { deliveryNote, stockItem, ...rest } = source;
  const shaped: Record<string, unknown> = { ...rest };
  if (deliveryNote && typeof deliveryNote === "object") {
    shaped.deliveryNoteId = (deliveryNote as { id: unknown }).id;
  }
  if (stockItem && typeof stockItem === "object") {
    shaped.stockItemId = (stockItem as { id: unknown }).id;
  }
  return shaped;
}

@Injectable()
export class MongoDeliveryNoteItemRepository
  extends MongoTenantScopedRepository<DeliveryNoteItem>
  implements DeliveryNoteItemRepository
{
  constructor(
    @InjectModel("DeliveryNoteItem") model: Model<DeliveryNoteItem>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoDeliveryNoteItemRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoDeliveryNoteItemRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoDeliveryNoteItemRepository {
    return new MongoDeliveryNoteItemRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: DeliveryNoteItem): Promise<DeliveryNoteItem> {
    if (entity.companyId !== companyId) {
      throw new Error("Delivery note item does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: DeliveryNoteItem): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Delivery note item does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  create(data: DeepPartial<DeliveryNoteItem>): Promise<DeliveryNoteItem> {
    return super.create(toDocumentShape(data) as DeepPartial<DeliveryNoteItem>);
  }

  createMany(rows: Array<DeepPartial<DeliveryNoteItem>>): Promise<DeliveryNoteItem[]> {
    return Promise.all(rows.map((row) => this.create(row)));
  }

  async findManyByStockItemForCompany(
    companyId: number,
    stockItemId: number,
  ): Promise<DeliveryNoteItem[]> {
    const docs = await this.documents.find({ companyId, stockItemId }).lean().exec();
    return this.toDomainList(docs);
  }

  async supplierNamesForStockItems(
    companyId: number,
    itemIds: number[],
  ): Promise<Array<{ stockItemId: number; supplierName: string }>> {
    const rows = await this.documents
      .aggregate([
        { $match: { companyId, stockItemId: { $in: itemIds } } },
        {
          $lookup: {
            from: "delivery_notes",
            localField: "deliveryNoteId",
            foreignField: "_id",
            as: "deliveryNote",
          },
        },
        { $unwind: "$deliveryNote" },
        {
          $group: {
            _id: { stockItemId: "$stockItemId", supplierName: "$deliveryNote.supplierName" },
          },
        },
      ])
      .exec();
    return rows.map((row) => ({
      stockItemId: Number(row._id.stockItemId),
      supplierName: row._id.supplierName as string,
    }));
  }
}
