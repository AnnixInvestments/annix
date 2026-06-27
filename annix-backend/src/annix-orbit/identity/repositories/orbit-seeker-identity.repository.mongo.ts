import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../../lib/persistence/mongo-connections";
import { OrbitSeekerIdentity } from "../entities/orbit-seeker-identity.entity";
import { MongoOrbitIdentityRepository } from "./orbit-identity.repository.mongo";
import { OrbitSeekerIdentityRepository } from "./orbit-seeker-identity.repository";

@Injectable()
export class MongoOrbitSeekerIdentityRepository
  extends MongoOrbitIdentityRepository<OrbitSeekerIdentity>
  implements OrbitSeekerIdentityRepository
{
  constructor(
    @InjectModel("OrbitSeekerIdentity", ORBIT_CONNECTION) model: Model<OrbitSeekerIdentity>,
    @InjectConnection() coreConnection: Connection,
  ) {
    super(model, coreConnection);
  }
}
