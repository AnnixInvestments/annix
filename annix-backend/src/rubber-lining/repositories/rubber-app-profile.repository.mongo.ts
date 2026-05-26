import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberAppProfile } from "../entities/rubber-app-profile.entity";
import { RubberAppProfileRepository } from "./rubber-app-profile.repository";

@Injectable()
export class MongoRubberAppProfileRepository
  extends MongoCrudRepository<RubberAppProfile>
  implements RubberAppProfileRepository
{
  constructor(@InjectModel("RubberAppProfile") model: Model<RubberAppProfile>) {
    super(model);
  }

  build(data: Partial<RubberAppProfile>): RubberAppProfile {
    return data as RubberAppProfile;
  }

  mergeInto(existing: RubberAppProfile, updates: Partial<RubberAppProfile>): RubberAppProfile {
    return { ...existing, ...updates };
  }
}
