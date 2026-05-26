import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PipeSupportSpacing } from "./entities/pipe-support-spacing.entity";
import { PipeSupportSpacingRepository } from "./pipe-support-spacing.repository";

@Injectable()
export class MongoPipeSupportSpacingRepository
  extends MongoCrudRepository<PipeSupportSpacing>
  implements PipeSupportSpacingRepository
{
  constructor(@InjectModel("PipeSupportSpacing") model: Model<PipeSupportSpacing>) {
    super(model);
  }
}
