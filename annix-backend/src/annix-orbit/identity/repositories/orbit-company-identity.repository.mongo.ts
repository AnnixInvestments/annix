import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../../lib/persistence/mongo-connections";
import { OrbitCompanyIdentity } from "../entities/orbit-company-identity.entity";
import { OrbitCompanyIdentityRepository } from "./orbit-company-identity.repository";
import { MongoOrbitIdentityRepository } from "./orbit-identity.repository.mongo";

@Injectable()
export class MongoOrbitCompanyIdentityRepository
  extends MongoOrbitIdentityRepository<OrbitCompanyIdentity>
  implements OrbitCompanyIdentityRepository
{
  constructor(
    @InjectModel("OrbitCompanyIdentity", ORBIT_CONNECTION) model: Model<OrbitCompanyIdentity>,
    @InjectConnection() coreConnection: Connection,
  ) {
    super(model, coreConnection);
  }
}
