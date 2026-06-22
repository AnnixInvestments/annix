import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { SupplierDocument } from "../entities/supplier-document.entity";
import {
  type SupplierDocumentQueryFilters,
  SupplierDocumentRepository,
} from "./supplier-document.repository";

@Injectable()
export class MongoSupplierDocumentRepository
  extends MongoTenantScopedRepository<SupplierDocument>
  implements SupplierDocumentRepository
{
  constructor(
    @InjectModel("SupplierDocument") model: Model<SupplierDocument>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoSupplierDocumentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoSupplierDocumentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoSupplierDocumentRepository {
    return new MongoSupplierDocumentRepository(this.model, session);
  }

  build(data: DeepPartial<SupplierDocument>): SupplierDocument {
    return data as SupplierDocument;
  }

  async saveForCompany(companyId: number, entity: SupplierDocument): Promise<SupplierDocument> {
    if (entity.companyId !== companyId) {
      throw new Error("Supplier document does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: SupplierDocument): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Supplier document does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findAllFilteredForCompany(
    companyId: number,
    filters: SupplierDocumentQueryFilters,
  ): Promise<SupplierDocument[]> {
    const query: Record<string, unknown> = { companyId };

    if (filters.supplierId) {
      query.supplierId = filters.supplierId;
    }
    if (filters.docType) {
      query.docType = filters.docType;
    }

    const docs = await this.documents
      .find(query)
      .populate(["supplier"])
      .sort({ expiresAt: 1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierDocument | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(nestPopulate(relations))
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async updateByIdForCompany(
    id: number,
    companyId: number,
    updates: DeepPartial<SupplierDocument>,
  ): Promise<void> {
    await this.documents.updateOne({ _id: id, companyId }, { $set: updates }).exec();
  }

  async deleteByIdForCompany(id: number, companyId: number): Promise<void> {
    await this.documents.deleteOne({ _id: id, companyId }).exec();
  }
}
