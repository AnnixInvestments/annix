import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberBondingAgent } from "../entities/rubber-bonding-agent.entity";
import { RubberBondingAgentRepository } from "./rubber-bonding-agent.repository";

@Injectable()
export class MongoRubberBondingAgentRepository
  extends MongoCrudRepository<RubberBondingAgent>
  implements RubberBondingAgentRepository
{
  constructor(
    @InjectModel("RubberBondingAgent")
    model: Model<RubberBondingAgent>,
  ) {
    super(model);
  }

  async findAllForCompany(companyId: number): Promise<RubberBondingAgent[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ supplier: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<RubberBondingAgent | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
