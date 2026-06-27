import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NixExtractionRegion } from "./entities/nix-extraction-region.entity";
import { NixExtractionRegionRepository } from "./nix-extraction-region.repository";

@Injectable()
export class MongoNixExtractionRegionRepository
  extends MongoCrudRepository<NixExtractionRegion>
  implements NixExtractionRegionRepository
{
  constructor(@InjectModel("NixExtractionRegion") model: Model<NixExtractionRegion>) {
    super(model);
  }

  async findCustomFieldDefinitions(): Promise<NixExtractionRegion[]> {
    return this.toDomainList(
      await this.documents
        .find({ isCustomField: true, isActive: true })
        .sort({ documentCategory: 1, fieldName: 1 })
        .lean()
        .exec(),
    );
  }

  async findCustomFieldDefinitionsForCategory(
    documentCategory: string,
  ): Promise<NixExtractionRegion[]> {
    return this.toDomainList(
      await this.documents
        .find({ isCustomField: true, isActive: true, documentCategory })
        .sort({ fieldName: 1 })
        .lean()
        .exec(),
    );
  }

  async findActiveByCategoryAndField(
    documentCategory: string,
    fieldName: string,
    quarantined?: boolean,
  ): Promise<NixExtractionRegion | null> {
    // Lane-scoped: an anonymous (quarantined) write only ever finds/updates a
    // region in the quarantined lane; a trusted write only the trusted lane
    // (quarantined absent/false), so anon writes can't mutate admin-trained
    // regions. Never passes `undefined` as a query value.
    const laneFilter = quarantined === true ? true : { $ne: true };
    return this.toDomain(
      await this.documents
        .findOne({ documentCategory, fieldName, isActive: true, quarantined: laneFilter })
        .lean()
        .exec(),
    );
  }

  async findActiveForCategory(documentCategory: string): Promise<NixExtractionRegion[]> {
    return this.toDomainList(
      await this.documents
        .find({ documentCategory, isActive: true, quarantined: { $ne: true } })
        .sort({ fieldName: 1 })
        .lean()
        .exec(),
    );
  }

  async findAllActive(): Promise<NixExtractionRegion[]> {
    return this.toDomainList(
      await this.documents
        .find({ isActive: true })
        .sort({ documentCategory: 1, fieldName: 1 })
        .lean()
        .exec(),
    );
  }

  async deactivate(id: number): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { $set: { isActive: false } }).exec();
  }
}
