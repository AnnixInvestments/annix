import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberPriceListItem } from "../entities/rubber-price-list-item.entity";
import { RubberPriceListItemRepository } from "./rubber-price-list-item.repository";

@Injectable()
export class MongoRubberPriceListItemRepository
  extends MongoTenantScopedRepository<RubberPriceListItem>
  implements RubberPriceListItemRepository
{
  constructor(
    @InjectModel("RubberPriceListItem") model: Model<RubberPriceListItem>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoRubberPriceListItemRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberPriceListItemRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoRubberPriceListItemRepository {
    return new MongoRubberPriceListItemRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: RubberPriceListItem,
  ): Promise<RubberPriceListItem> {
    if (entity.companyId !== companyId) {
      throw new Error("Rubber price list item does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: RubberPriceListItem): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Rubber price list item does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findAllForCompany(companyId: number): Promise<RubberPriceListItem[]> {
    return this.cappedFullLoad(
      "findAllForCompany",
      { companyId },
      { sort: { supplier: 1, productCode: 1, cureType: 1 } },
    );
  }

  async findOneForCompany(companyId: number, id: number): Promise<RubberPriceListItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteAllForCompany(companyId: number): Promise<number> {
    const result = await this.documents.deleteMany({ companyId }).exec();
    return result.deletedCount ?? 0;
  }
}
