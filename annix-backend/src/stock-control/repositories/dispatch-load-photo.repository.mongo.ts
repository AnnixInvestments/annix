import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { DispatchLoadPhoto } from "../entities/dispatch-load-photo.entity";
import { DispatchLoadPhotoRepository } from "./dispatch-load-photo.repository";

@Injectable()
export class MongoDispatchLoadPhotoRepository
  extends MongoTenantScopedRepository<DispatchLoadPhoto>
  implements DispatchLoadPhotoRepository
{
  constructor(
    @InjectModel("DispatchLoadPhoto") model: Model<DispatchLoadPhoto>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoDispatchLoadPhotoRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoDispatchLoadPhotoRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoDispatchLoadPhotoRepository {
    return new MongoDispatchLoadPhotoRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: DispatchLoadPhoto): Promise<DispatchLoadPhoto> {
    if (entity.companyId !== companyId) {
      throw new Error("Dispatch load photo does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: DispatchLoadPhoto): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Dispatch load photo does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<DispatchLoadPhoto[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(photoId: number, companyId: number): Promise<DispatchLoadPhoto | null> {
    const doc = await this.documents.findOne({ _id: photoId, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
