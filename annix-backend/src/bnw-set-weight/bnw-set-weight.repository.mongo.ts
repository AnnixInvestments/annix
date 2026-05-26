import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BnwSetWeightRepository } from "./bnw-set-weight.repository";
import { BnwSetWeight } from "./entities/bnw-set-weight.entity";

@Injectable()
export class MongoBnwSetWeightRepository
  extends MongoCrudRepository<BnwSetWeight>
  implements BnwSetWeightRepository
{
  constructor(@InjectModel("BnwSetWeight") model: Model<BnwSetWeight>) {
    super(model);
  }

  async availablePressureClasses(): Promise<string[]> {
    const result = await this.documents.distinct("pressure_class", {}).exec();
    return (result as string[]).sort();
  }
}
