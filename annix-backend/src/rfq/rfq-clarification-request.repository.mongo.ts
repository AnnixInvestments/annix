import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { RfqClarificationRequest } from "./entities/rfq-clarification-request.entity";
import { RfqClarificationRequestRepository } from "./rfq-clarification-request.repository";

@Injectable()
export class MongoRfqClarificationRequestRepository
  extends MongoCrudRepository<RfqClarificationRequest>
  implements RfqClarificationRequestRepository
{
  constructor(@InjectModel("RfqClarificationRequest") model: Model<RfqClarificationRequest>) {
    super(model);
  }

  async findByToken(token: string): Promise<RfqClarificationRequest | null> {
    const document = await this.documents.findOne({ token }).lean().exec();
    return this.toDomain(document);
  }
}
