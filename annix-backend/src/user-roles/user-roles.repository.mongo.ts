import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { UserRole } from "./entities/user-role.entity";
import { UserRoleRepository } from "./user-roles.repository";

@Injectable()
export class MongoUserRoleRepository
  extends MongoCrudRepository<UserRole>
  implements UserRoleRepository
{
  constructor(@InjectModel("UserRole") model: Model<UserRole>) {
    super(model);
  }

  async findByName(name: string): Promise<UserRole | null> {
    const document = await this.documents.findOne({ name }).lean().exec();
    return this.toDomain(document);
  }
}
