import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NixUserPreference } from "./entities/nix-user-preference.entity";
import { NixUserPreferenceRepository } from "./nix-user-preference.repository";

@Injectable()
export class MongoNixUserPreferenceRepository
  extends MongoCrudRepository<NixUserPreference>
  implements NixUserPreferenceRepository
{
  constructor(@InjectModel("NixUserPreference") model: Model<NixUserPreference>) {
    super(model);
  }
}
