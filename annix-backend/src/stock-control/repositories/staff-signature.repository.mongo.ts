import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StaffSignature } from "../entities/staff-signature.entity";
import { StaffSignatureRepository } from "./staff-signature.repository";

@Injectable()
export class MongoStaffSignatureRepository
  extends MongoCrudRepository<StaffSignature>
  implements StaffSignatureRepository
{
  constructor(@InjectModel("StaffSignature") model: Model<StaffSignature>) {
    super(model);
  }

  async findByUser(userId: number): Promise<StaffSignature | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }
}
