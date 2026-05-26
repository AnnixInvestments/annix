import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import { RubberDeliveryNoteItem } from "../entities/rubber-delivery-note-item.entity";
import {
  type DeliveryNoteRollNumberRow,
  RubberDeliveryNoteItemRepository,
  type SourceSupplierCocRow,
} from "./rubber-delivery-note-item.repository";

@Injectable()
export class MongoRubberDeliveryNoteItemRepository
  extends MongoCrudRepository<RubberDeliveryNoteItem>
  implements RubberDeliveryNoteItemRepository
{
  constructor(
    @InjectModel("RubberDeliveryNoteItem")
    model: Model<RubberDeliveryNoteItem>,
  ) {
    super(model);
  }

  build(data: Partial<RubberDeliveryNoteItem>): RubberDeliveryNoteItem {
    return data as RubberDeliveryNoteItem;
  }

  saveMany(entities: RubberDeliveryNoteItem[]): Promise<RubberDeliveryNoteItem[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  async removeMany(entities: RubberDeliveryNoteItem[]): Promise<void> {
    if (entities.length === 0) return;
    const ids = entities.map((entity) => entity.id);
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
  }

  async findByDeliveryNoteId(deliveryNoteId: number): Promise<RubberDeliveryNoteItem[]> {
    const docs = await this.documents.find({ deliveryNoteId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByDeliveryNoteIdOrderedById(deliveryNoteId: number): Promise<RubberDeliveryNoteItem[]> {
    const docs = await this.documents.find({ deliveryNoteId }).sort({ _id: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteByDeliveryNoteId(deliveryNoteId: number): Promise<void> {
    await this.documents.deleteMany({ deliveryNoteId }).exec();
  }

  async findRollNumbersByDeliveryNoteIds(noteIds: number[]): Promise<DeliveryNoteRollNumberRow[]> {
    if (noteIds.length === 0) return [];
    const docs = await this.documents
      .find({ deliveryNoteId: { $in: noteIds }, rollNumber: { $ne: null } })
      .select("deliveryNoteId rollNumber")
      .sort({ _id: 1 })
      .lean()
      .exec();
    return docs.map((doc) => ({
      deliveryNoteId: Number(doc.deliveryNoteId),
      rollNumber: String(doc.rollNumber),
    }));
  }

  async sourceSupplierCocsForCustomerDn(deliveryNoteId: number): Promise<SourceSupplierCocRow[]> {
    const rollStockCollection = this.model.db.model("RubberRollStock").collection.collectionName;
    const supplierDnCollection =
      this.model.db.model("RubberDeliveryNote").collection.collectionName;
    const supplierCocCollection =
      this.model.db.model("RubberSupplierCoc").collection.collectionName;
    const companyCollection = this.model.db.model("RubberCompany").collection.collectionName;

    const rows = await this.documents
      .aggregate<{
        _id: number;
        cocNumber: string | null;
        supplierCompanyId: number | null;
        supplierName: string | null;
        rollCount: number;
      }>([
        { $match: { deliveryNoteId, rollNumber: { $ne: null } } },
        {
          $lookup: {
            from: rollStockCollection,
            let: { rollNumber: "$rollNumber", dnId: "$deliveryNoteId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$rollNumber", "$$rollNumber"] },
                      { $eq: ["$customerDeliveryNoteId", "$$dnId"] },
                    ],
                  },
                },
              },
            ],
            as: "rollStock",
          },
        },
        { $unwind: "$rollStock" },
        {
          $lookup: {
            from: supplierDnCollection,
            localField: "rollStock.supplierDeliveryNoteId",
            foreignField: "_id",
            as: "sdn",
          },
        },
        { $unwind: "$sdn" },
        {
          $lookup: {
            from: supplierCocCollection,
            localField: "sdn.linkedCocId",
            foreignField: "_id",
            as: "coc",
          },
        },
        { $unwind: "$coc" },
        {
          $match: {
            "coc.versionStatus": {
              $nin: [DocumentVersionStatus.REJECTED, DocumentVersionStatus.SUPERSEDED],
            },
          },
        },
        {
          $lookup: {
            from: companyCollection,
            localField: "coc.supplierCompanyId",
            foreignField: "_id",
            as: "company",
          },
        },
        { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$coc._id",
            cocNumber: { $first: "$coc.cocNumber" },
            supplierCompanyId: { $first: "$coc.supplierCompanyId" },
            supplierName: { $first: "$company.name" },
            rollStockIds: { $addToSet: "$rollStock._id" },
          },
        },
        {
          $project: {
            cocNumber: 1,
            supplierCompanyId: 1,
            supplierName: 1,
            rollCount: { $size: "$rollStockIds" },
          },
        },
        { $sort: { rollCount: -1, cocNumber: 1 } },
      ])
      .exec();

    return rows.map((row) => ({
      id: Number(row._id),
      cocNumber: row.cocNumber == null ? null : String(row.cocNumber),
      supplierCompanyId: row.supplierCompanyId == null ? null : Number(row.supplierCompanyId),
      supplierCompanyName: row.supplierName == null ? null : String(row.supplierName),
      rollCount: Number(row.rollCount),
    }));
  }
}
