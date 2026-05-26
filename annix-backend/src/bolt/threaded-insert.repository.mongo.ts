import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ThreadedInsert } from "./entities/threaded-insert.entity";
import { ThreadedInsertRepository } from "./threaded-insert.repository";

@Injectable()
export class MongoThreadedInsertRepository
  extends MongoCrudRepository<ThreadedInsert>
  implements ThreadedInsertRepository
{
  constructor(@InjectModel("ThreadedInsert") model: Model<ThreadedInsert>) {
    super(model);
  }

  async insertTypesGrouped(): Promise<Array<{ type: string; count: number }>> {
    const results = await this.documents.aggregate([
      { $group: { _id: "$insertType", count: { $sum: 1 } } },
      { $project: { _id: 0, type: "$_id", count: 1 } },
    ]);
    return results as Array<{ type: string; count: number }>;
  }

  async insertSizesForType(type: string): Promise<Array<{ size: string }>> {
    const results = (await this.documents
      .distinct("designation", { insertType: type })
      .exec()) as string[];
    return results
      .slice()
      .sort()
      .map((designation) => ({ size: designation }));
  }

  async insertGradesForTypeAndSize(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    const results = await this.documents.aggregate([
      { $match: { insertType: type, designation: size } },
      { $group: { _id: "$material" } },
      { $project: { _id: 0, material: "$_id", grade: { $literal: null } } },
    ]);
    return results as Array<{ grade: string | null; material: string | null }>;
  }
}
