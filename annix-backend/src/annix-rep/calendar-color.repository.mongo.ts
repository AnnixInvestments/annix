import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CalendarColorRepository } from "./calendar-color.repository";
import { CalendarColor, CalendarColorType } from "./entities/calendar-color.entity";

@Injectable()
export class MongoCalendarColorRepository
  extends MongoCrudRepository<CalendarColor>
  implements CalendarColorRepository
{
  constructor(@InjectModel("CalendarColor") model: Model<CalendarColor>) {
    super(model);
  }

  async findByUser(userId: number): Promise<CalendarColor[]> {
    const docs = await this.documents.find({ userId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByUserTypeKey(
    userId: number,
    colorType: CalendarColorType,
    colorKey: string,
  ): Promise<CalendarColor | null> {
    const doc = await this.documents.findOne({ userId, colorType, colorKey }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.documents.deleteMany({ userId }).exec();
  }

  async deleteByUserAndType(userId: number, colorType: CalendarColorType): Promise<void> {
    await this.documents.deleteMany({ userId, colorType }).exec();
  }
}
