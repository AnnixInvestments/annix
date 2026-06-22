import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { PaintPriceListItem } from "../entities/paint-price-list-item.entity";
import { PaintPriceListItemRepository } from "./paint-price-list-item.repository";

@Injectable()
export class MongoPaintPriceListItemRepository
  extends MongoTenantScopedRepository<PaintPriceListItem>
  implements PaintPriceListItemRepository
{
  constructor(
    @InjectModel("PaintPriceListItem")
    model: Model<PaintPriceListItem>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoPaintPriceListItemRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoPaintPriceListItemRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoPaintPriceListItemRepository {
    return new MongoPaintPriceListItemRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: PaintPriceListItem): Promise<PaintPriceListItem> {
    if (entity.companyId !== companyId) {
      throw new Error("Paint price list item does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: PaintPriceListItem): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Paint price list item does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findAllForCompany(companyId: number): Promise<PaintPriceListItem[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ supplierName: 1, productName: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<PaintPriceListItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
