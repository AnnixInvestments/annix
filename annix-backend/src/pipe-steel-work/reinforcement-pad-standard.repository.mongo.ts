import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ReinforcementPadStandardEntity } from "./entities/reinforcement-pad-standard.entity";
import { ReinforcementPadStandardRepository } from "./reinforcement-pad-standard.repository";

@Injectable()
export class MongoReinforcementPadStandardRepository
  extends MongoCrudRepository<ReinforcementPadStandardEntity>
  implements ReinforcementPadStandardRepository
{
  constructor(
    @InjectModel("ReinforcementPadStandardEntity")
    model: Model<ReinforcementPadStandardEntity>,
  ) {
    super(model);
  }

  async findByBranchAndHeader(
    branchNbMm: number,
    headerNbMm: number,
  ): Promise<ReinforcementPadStandardEntity | null> {
    const document = await this.documents.findOne({ branchNbMm, headerNbMm }).lean().exec();
    return this.toDomain(document);
  }
}
