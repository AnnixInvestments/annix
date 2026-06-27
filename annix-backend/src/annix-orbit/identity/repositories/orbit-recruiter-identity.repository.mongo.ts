import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../../lib/persistence/mongo-connections";
import { OrbitRecruiterIdentity } from "../entities/orbit-recruiter-identity.entity";
import { MongoOrbitIdentityRepository } from "./orbit-identity.repository.mongo";
import { OrbitRecruiterIdentityRepository } from "./orbit-recruiter-identity.repository";

@Injectable()
export class MongoOrbitRecruiterIdentityRepository
  extends MongoOrbitIdentityRepository<OrbitRecruiterIdentity>
  implements OrbitRecruiterIdentityRepository
{
  constructor(
    @InjectModel("OrbitRecruiterIdentity", ORBIT_CONNECTION) model: Model<OrbitRecruiterIdentity>,
    @InjectConnection() coreConnection: Connection,
  ) {
    super(model, coreConnection);
  }
}
