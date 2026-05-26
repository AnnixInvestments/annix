import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BoltRepository } from "./bolt.repository";
import { BoltFilters } from "./bolt.service";
import { Bolt } from "./entities/bolt.entity";

@Injectable()
export class MongoBoltRepository extends MongoCrudRepository<Bolt> implements BoltRepository {
  constructor(@InjectModel("Bolt") model: Model<Bolt>) {
    super(model);
  }

  async filteredBolts(filters: BoltFilters): Promise<Bolt[]> {
    const filter: Record<string, unknown> = {};
    if (filters.grade) {
      filter.grade = filters.grade;
    }
    if (filters.material) {
      filter.material = { $regex: filters.material, $options: "i" };
    }
    if (filters.headStyle) {
      filter.headStyle = filters.headStyle;
    }
    if (filters.size) {
      filter.designation = { $regex: `^${filters.size}` };
    }
    const docs = await this.documents.find(filter).sort({ designation: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async boltCategoriesGrouped(): Promise<Array<{ type: string; count: number }>> {
    const results = await this.documents.aggregate([
      { $match: { category: { $ne: null } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { _id: 0, type: "$_id", count: 1 } },
    ]);
    return results as Array<{ type: string; count: number }>;
  }

  async fastenerSizesForBolt(type: string): Promise<Array<{ size: string }>> {
    const results = (await this.documents
      .distinct("designation", { category: type })
      .exec()) as string[];
    return results
      .slice()
      .sort()
      .map((designation) => ({ size: designation }));
  }

  async fastenerGradesForBolt(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    const results = await this.documents.aggregate([
      {
        $match: {
          category: type,
          designation: { $regex: `^${size}` },
        },
      },
      {
        $group: {
          _id: { grade: "$grade", material: "$material" },
        },
      },
      {
        $project: {
          _id: 0,
          grade: "$_id.grade",
          material: "$_id.material",
        },
      },
    ]);
    return results as Array<{ grade: string | null; material: string | null }>;
  }
}
