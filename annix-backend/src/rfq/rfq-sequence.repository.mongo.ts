import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { RfqSequence } from "./entities/rfq-sequence.entity";
import { RfqSequenceRepository } from "./rfq-sequence.repository";

@Injectable()
export class MongoRfqSequenceRepository
  extends MongoCrudRepository<RfqSequence>
  implements RfqSequenceRepository
{
  constructor(@InjectModel("RfqSequence") model: Model<RfqSequence>) {
    super(model);
  }

  async findByYear(year: number): Promise<RfqSequence | null> {
    const document = await this.documents.findOne({ year }).lean().exec();
    return this.toDomain(document);
  }

  async findAllOrderedByYearDesc(): Promise<RfqSequence[]> {
    const documents = await this.documents.find().sort({ year: -1 }).lean().exec();
    return this.toDomainList(documents);
  }
}
