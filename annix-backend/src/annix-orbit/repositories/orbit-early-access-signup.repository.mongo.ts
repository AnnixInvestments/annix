import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { OrbitEarlyAccessSignup } from "../entities/orbit-early-access-signup.entity";
import { OrbitEarlyAccessSignupRepository } from "./orbit-early-access-signup.repository";

@Injectable()
export class MongoOrbitEarlyAccessSignupRepository
  extends MongoCrudRepository<OrbitEarlyAccessSignup>
  implements OrbitEarlyAccessSignupRepository
{
  constructor(
    @InjectModel("OrbitEarlyAccessSignup", ORBIT_CONNECTION) model: Model<OrbitEarlyAccessSignup>,
  ) {
    super(model);
  }

  async findByEmailNormalized(email: string): Promise<OrbitEarlyAccessSignup | null> {
    const doc = await this.documents.findOne({ emailNormalized: email }).lean().exec();
    return this.toDomain(doc);
  }

  async findByMobileNormalized(mobile: string): Promise<OrbitEarlyAccessSignup | null> {
    const doc = await this.documents.findOne({ mobileNormalized: mobile }).lean().exec();
    return this.toDomain(doc);
  }

  async findByReferralCode(code: string): Promise<OrbitEarlyAccessSignup | null> {
    const doc = await this.documents.findOne({ referralCode: code }).lean().exec();
    return this.toDomain(doc);
  }

  async listNewestFirst(): Promise<OrbitEarlyAccessSignup[]> {
    const docs = await this.documents.find().sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
