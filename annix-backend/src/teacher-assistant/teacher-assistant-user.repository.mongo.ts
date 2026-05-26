import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { TeacherAssistantUser } from "./entities/teacher-assistant-user.entity";
import { TeacherAssistantUserRepository } from "./teacher-assistant-user.repository";

@Injectable()
export class MongoTeacherAssistantUserRepository
  extends MongoCrudRepository<TeacherAssistantUser>
  implements TeacherAssistantUserRepository
{
  constructor(@InjectModel("TeacherAssistantUser") model: Model<TeacherAssistantUser>) {
    super(model);
  }

  async findByEmail(email: string): Promise<TeacherAssistantUser | null> {
    const document = await this.documents.findOne({ email }).lean().exec();
    return this.toDomain(document);
  }

  async findAllOrderedById(): Promise<TeacherAssistantUser[]> {
    const documents = await this.documents.find().sort({ _id: 1 }).lean().exec();
    return this.toDomainList(documents);
  }
}
