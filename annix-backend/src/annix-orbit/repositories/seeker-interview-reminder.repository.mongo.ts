import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerInterviewReminder } from "../entities/seeker-interview-reminder.entity";
import { SeekerInterviewReminderRepository } from "./seeker-interview-reminder.repository";

@Injectable()
export class MongoSeekerInterviewReminderRepository
  extends MongoCrudRepository<SeekerInterviewReminder>
  implements SeekerInterviewReminderRepository
{
  constructor(
    @InjectModel("SeekerInterviewReminder", ORBIT_CONNECTION)
    model: Model<SeekerInterviewReminder>,
  ) {
    super(model);
  }

  async findSent(
    source: string,
    sourceId: number,
    offset: string,
  ): Promise<SeekerInterviewReminder | null> {
    const doc = await this.documents.findOne({ source, sourceId, offset }).lean().exec();
    return this.toDomain(doc);
  }
}
