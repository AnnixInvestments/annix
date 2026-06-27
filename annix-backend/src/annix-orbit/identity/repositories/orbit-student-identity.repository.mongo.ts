import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../../lib/persistence/mongo-connections";
import { OrbitStudentIdentity } from "../entities/orbit-student-identity.entity";
import { MongoOrbitIdentityRepository } from "./orbit-identity.repository.mongo";
import { OrbitStudentIdentityRepository } from "./orbit-student-identity.repository";

@Injectable()
export class MongoOrbitStudentIdentityRepository
  extends MongoOrbitIdentityRepository<OrbitStudentIdentity>
  implements OrbitStudentIdentityRepository
{
  constructor(
    @InjectModel("OrbitStudentIdentity", ORBIT_CONNECTION) model: Model<OrbitStudentIdentity>,
    @InjectConnection() coreConnection: Connection,
  ) {
    super(model, coreConnection);
  }
}
