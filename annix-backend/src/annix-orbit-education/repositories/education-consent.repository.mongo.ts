import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationConsent } from "../entities/education-consent.entity";
import { EducationConsentRepository } from "./education-consent.repository";

@Injectable()
export class MongoEducationConsentRepository
  extends MongoCrudRepository<EducationConsent>
  implements EducationConsentRepository
{
  constructor(@InjectModel("EducationConsent", ORBIT_CONNECTION) model: Model<EducationConsent>) {
    super(model);
  }

  async activeForProfile(educationProfileId: string): Promise<EducationConsent | null> {
    const doc = await this.documents.findOne({ educationProfileId, revokedAt: null }).lean().exec();
    return this.toDomain(doc);
  }

  async revokeActiveForProfile(educationProfileId: string, revokedAt: Date): Promise<number> {
    const result = await this.documents
      .updateMany({ educationProfileId, revokedAt: null }, { revokedAt })
      .exec();
    return result.modifiedCount ?? 0;
  }
}
