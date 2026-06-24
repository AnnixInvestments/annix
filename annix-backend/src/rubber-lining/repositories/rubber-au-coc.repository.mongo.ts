import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AuCocStatus, RubberAuCoc } from "../entities/rubber-au-coc.entity";
import {
  type AuCocDeliveryNoteRef,
  type AuCocListFilters,
  type AuCocWithItemCount,
  RubberAuCocRepository,
} from "./rubber-au-coc.repository";

type Doc = Record<string, unknown>;

const COC_SEQUENCE_KEY = "rubber_au_coc_number_seq";

@Injectable()
export class MongoRubberAuCocRepository
  extends MongoCrudRepository<RubberAuCoc>
  implements RubberAuCocRepository
{
  constructor(@InjectModel("RubberAuCoc") model: Model<RubberAuCoc>) {
    super(model);
  }

  build(data: Partial<RubberAuCoc>): RubberAuCoc {
    return data as RubberAuCoc;
  }

  saveMany(entities: RubberAuCoc[]): Promise<RubberAuCoc[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async updateById(id: number, updates: DeepPartial<RubberAuCoc>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return (result.deletedCount || 0) > 0;
  }

  async findWithItemCounts(filters?: AuCocListFilters): Promise<AuCocWithItemCount[]> {
    const filter: Doc = {};
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.customerCompanyId) {
      filter.customerCompanyId = filters.customerCompanyId;
    }
    const docs = await this.documents
      .find(filter)
      .populate("customerCompany")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const itemModel = this.model.db.model<Doc>("RubberAuCocItem");
    return Promise.all(
      this.toDomainList(docs).map(async (coc) => ({
        coc,
        linkedItemCount: await itemModel.countDocuments({ auCocId: coc.id }).exec(),
      })),
    );
  }

  async findByStatusesOrderedById(statuses: AuCocStatus[]): Promise<RubberAuCoc[]> {
    const docs = await this.documents
      .find({ status: { $in: statuses } })
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdsOrderedById(ids: number[]): Promise<RubberAuCoc[]> {
    if (ids.length === 0) return [];
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdsWithCustomerOrderedById(ids: number[]): Promise<RubberAuCoc[]> {
    if (ids.length === 0) return [];
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .populate("customerCompany")
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByStatusWithCustomerOrderedByCocNumber(status: AuCocStatus): Promise<RubberAuCoc[]> {
    const docs = await this.documents
      .find({ status })
      .populate("customerCompany")
      .sort({ cocNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByStatus(status: AuCocStatus): Promise<RubberAuCoc[]> {
    const docs = await this.documents.find({ status }).lean().exec();
    return this.toDomainList(docs);
  }

  async findRefsByDeliveryNoteIds(dnIds: number[]): Promise<AuCocDeliveryNoteRef[]> {
    const docs = await this.documents
      .find({ sourceDeliveryNoteId: { $in: dnIds } })
      .select("_id cocNumber sourceDeliveryNoteId")
      .lean()
      .exec();
    return docs.map((doc) => ({
      id: doc._id as number,
      cocNumber: doc.cocNumber as string,
      sourceDeliveryNoteId: (doc.sourceDeliveryNoteId as number | null) ?? null,
    }));
  }

  async repointSourceDeliveryNoteId(oldId: number, newId: number): Promise<number> {
    const result = await this.documents
      .updateMany({ sourceDeliveryNoteId: oldId }, { $set: { sourceDeliveryNoteId: newId } })
      .exec();
    return result.modifiedCount ?? 0;
  }

  async nextCocSequence(): Promise<number> {
    const database = this.model.db.db;
    if (!database) {
      throw new Error("Mongo connection is not ready for CoC sequencing");
    }
    const counters = database.collection<{ _id: string; seq: number }>("counters");
    const incremented = await counters.findOneAndUpdate(
      { _id: COC_SEQUENCE_KEY },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true },
    );
    return incremented ? incremented.seq : 1;
  }
}
