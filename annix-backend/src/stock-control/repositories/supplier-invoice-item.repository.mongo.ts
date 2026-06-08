import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import { SupplierInvoiceItem } from "../entities/supplier-invoice-item.entity";
import { SupplierInvoiceItemRepository } from "./supplier-invoice-item.repository";

@Injectable()
export class MongoSupplierInvoiceItemRepository
  extends MongoCrudRepository<SupplierInvoiceItem>
  implements SupplierInvoiceItemRepository
{
  constructor(@InjectModel("SupplierInvoiceItem") model: Model<SupplierInvoiceItem>) {
    super(model);
  }

  buildMany(rows: DeepPartial<SupplierInvoiceItem>[]): SupplierInvoiceItem[] {
    return rows as SupplierInvoiceItem[];
  }

  async saveMany(entities: SupplierInvoiceItem[]): Promise<SupplierInvoiceItem[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  countByInvoice(invoiceId: number): Promise<number> {
    return this.documents.countDocuments({ invoiceId }).exec();
  }

  async deleteByInvoice(invoiceId: number): Promise<void> {
    await this.documents.deleteMany({ invoiceId }).exec();
  }

  async findByInvoice(invoiceId: number): Promise<SupplierInvoiceItem[]> {
    const docs = await this.documents.find({ invoiceId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByInvoiceWithRelations(
    invoiceId: number,
    relations: string[],
  ): Promise<SupplierInvoiceItem[]> {
    const docs = await this.documents
      .find({ invoiceId })
      .populate(nestPopulate(relations))
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByIdAndInvoice(id: number, invoiceId: number): Promise<SupplierInvoiceItem | null> {
    const doc = await this.documents.findOne({ _id: id, invoiceId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdAndInvoiceWithRelations(
    id: number,
    invoiceId: number,
    relations: string[],
  ): Promise<SupplierInvoiceItem | null> {
    const doc = await this.documents
      .findOne({ _id: id, invoiceId })
      .populate(nestPopulate(relations))
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
