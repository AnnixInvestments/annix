import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberChemicalCompatibility } from "../entities/rubber-chemical-compatibility.entity";
import { RubberChemicalCompatibilityRepository } from "./rubber-chemical-compatibility.repository";

@Injectable()
export class MongoRubberChemicalCompatibilityRepository
  extends MongoCrudRepository<RubberChemicalCompatibility>
  implements RubberChemicalCompatibilityRepository
{
  constructor(
    @InjectModel("RubberChemicalCompatibility")
    model: Model<RubberChemicalCompatibility>,
  ) {
    super(model);
  }
}
