import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ExpansionJointRfq } from "./entities/expansion-joint-rfq.entity";
import { ExpansionJointRfqRepository } from "./expansion-joint-rfq.repository";

@Injectable()
export class MongoExpansionJointRfqRepository
  extends MongoCrudRepository<ExpansionJointRfq>
  implements ExpansionJointRfqRepository
{
  constructor(@InjectModel("ExpansionJointRfq") model: Model<ExpansionJointRfq>) {
    super(model);
  }
}
