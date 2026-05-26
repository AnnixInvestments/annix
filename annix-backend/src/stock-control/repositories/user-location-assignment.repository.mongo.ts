import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";
import { UserLocationAssignmentRepository } from "./user-location-assignment.repository";

@Injectable()
export class MongoUserLocationAssignmentRepository
  extends MongoCrudRepository<UserLocationAssignment>
  implements UserLocationAssignmentRepository
{
  constructor(@InjectModel("UserLocationAssignment") model: Model<UserLocationAssignment>) {
    super(model);
  }

  buildMany(rows: DeepPartial<UserLocationAssignment>[]): UserLocationAssignment[] {
    return rows as UserLocationAssignment[];
  }

  async saveMany(entities: UserLocationAssignment[]): Promise<UserLocationAssignment[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async findForCompanyWithRelations(companyId: number): Promise<UserLocationAssignment[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate(["user", "location"])
      .sort({ userId: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForUser(companyId: number, userId: number): Promise<UserLocationAssignment[]> {
    const docs = await this.documents
      .find({ companyId, userId })
      .select("locationId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteForUser(companyId: number, userId: number): Promise<void> {
    await this.documents.deleteMany({ companyId, userId }).exec();
  }
}
