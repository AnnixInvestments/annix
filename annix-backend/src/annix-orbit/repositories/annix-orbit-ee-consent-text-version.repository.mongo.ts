import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitEeConsentTextVersion } from "../entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitEeConsentTextVersionRepository } from "./annix-orbit-ee-consent-text-version.repository";

@Injectable()
export class MongoAnnixOrbitEeConsentTextVersionRepository
  extends MongoCrudRepository<AnnixOrbitEeConsentTextVersion>
  implements AnnixOrbitEeConsentTextVersionRepository
{
  constructor(
    @InjectModel("AnnixOrbitEeConsentTextVersion")
    model: Model<AnnixOrbitEeConsentTextVersion>,
  ) {
    super(model);
  }

  async activeOpenEnded(now: Date): Promise<AnnixOrbitEeConsentTextVersion | null> {
    const doc = await this.documents
      .findOne({ effectiveFrom: { $lt: now }, effectiveTo: null })
      .sort({ effectiveFrom: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async activeAt(now: Date): Promise<AnnixOrbitEeConsentTextVersion | null> {
    const doc = await this.documents
      .findOne({
        effectiveFrom: { $lt: now },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }],
      })
      .sort({ effectiveFrom: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async latestOpenEnded(): Promise<AnnixOrbitEeConsentTextVersion | null> {
    const doc = await this.documents
      .findOne({ effectiveTo: null })
      .sort({ effectiveFrom: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
