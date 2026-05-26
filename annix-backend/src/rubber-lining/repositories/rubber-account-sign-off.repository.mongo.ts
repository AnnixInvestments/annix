import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberAccountSignOff } from "../entities/rubber-account-sign-off.entity";
import { RubberAccountSignOffRepository } from "./rubber-account-sign-off.repository";

@Injectable()
export class MongoRubberAccountSignOffRepository
  extends MongoCrudRepository<RubberAccountSignOff>
  implements RubberAccountSignOffRepository
{
  constructor(@InjectModel("RubberAccountSignOff") model: Model<RubberAccountSignOff>) {
    super(model);
  }

  build(data: Partial<RubberAccountSignOff>): RubberAccountSignOff {
    return data as RubberAccountSignOff;
  }

  async findByMonthlyAccountId(monthlyAccountId: number): Promise<RubberAccountSignOff[]> {
    const docs = await this.documents.find({ monthlyAccountId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByToken(token: string): Promise<RubberAccountSignOff | null> {
    const doc = await this.documents.findOne({ signOffToken: token }).lean().exec();
    return this.toDomain(doc);
  }
}
