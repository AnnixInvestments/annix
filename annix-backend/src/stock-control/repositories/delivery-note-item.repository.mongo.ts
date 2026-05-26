import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
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
  extends MongoCrudRepository<DeliveryNoteItem>
  implements DeliveryNoteItemRepository
{
  constructor(@InjectModel("DeliveryNoteItem") model: Model<DeliveryNoteItem>) {
    super(model);
  }

  create(data: DeepPartial<DeliveryNoteItem>): Promise<DeliveryNoteItem> {
    return super.create(toDocumentShape(data) as DeepPartial<DeliveryNoteItem>);
  }

  createMany(rows: Array<DeepPartial<DeliveryNoteItem>>): Promise<DeliveryNoteItem[]> {
    return Promise.all(rows.map((row) => this.create(row)));
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
