import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DashboardPreference } from "../entities/dashboard-preference.entity";
import { DashboardPreferenceRepository } from "./dashboard-preference.repository";

@Injectable()
export class MongoDashboardPreferenceRepository
  extends MongoCrudRepository<DashboardPreference>
  implements DashboardPreferenceRepository
{
  constructor(
    @InjectModel("DashboardPreference")
    model: Model<DashboardPreference>,
  ) {
    super(model);
  }

  async findOneForUser(companyId: number, userId: number): Promise<DashboardPreference | null> {
    const doc = await this.documents.findOne({ companyId, userId }).lean().exec();
    return this.toDomain(doc);
  }
}
