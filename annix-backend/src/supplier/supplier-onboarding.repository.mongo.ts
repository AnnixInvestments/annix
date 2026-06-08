import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { nestPopulate } from "../lib/persistence/nest-populate";
import {
  SupplierOnboarding,
  SupplierOnboardingStatus,
} from "./entities/supplier-onboarding.entity";
import { SupplierOnboardingRepository } from "./supplier-onboarding.repository";

@Injectable()
export class MongoSupplierOnboardingRepository
  extends MongoCrudRepository<SupplierOnboarding>
  implements SupplierOnboardingRepository
{
  constructor(@InjectModel("SupplierOnboarding") model: Model<SupplierOnboarding>) {
    super(model);
  }

  async findBySupplierId(supplierId: number): Promise<SupplierOnboarding | null> {
    const document = await this.documents
      .findOne({ supplierId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findBySupplierIdWithRelations(
    supplierId: number,
    relations: string[],
  ): Promise<SupplierOnboarding | null> {
    const document = await this.documents
      .findOne({ supplierId })
      .populate(nestPopulate(relations))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async updateDocumentsStatus(supplierId: number, documentsComplete: boolean): Promise<void> {
    await this.documents
      .updateMany({ supplierId }, { $set: { documentsComplete } })
      .session(this.session)
      .exec();
  }

  async findApprovedWithSupplier(): Promise<SupplierOnboarding[]> {
    const documents = await this.documents
      .find({ status: SupplierOnboardingStatus.APPROVED })
      .populate("supplier")
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
