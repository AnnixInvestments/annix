import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SalaryBenchmark } from "../entities/salary-benchmark.entity";
import { SalaryBenchmarkRepository } from "./salary-benchmark.repository";

@Injectable()
export class MongoSalaryBenchmarkRepository
  extends MongoCrudRepository<SalaryBenchmark>
  implements SalaryBenchmarkRepository
{
  constructor(@InjectModel("SalaryBenchmark", ORBIT_CONNECTION) model: Model<SalaryBenchmark>) {
    super(model);
  }

  async findByTitleAndProvince(
    normalizedTitle: string,
    province: string,
  ): Promise<SalaryBenchmark | null> {
    const doc = await this.documents.findOne({ normalizedTitle, province }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.documents.deleteMany({ updatedAt: { $lt: cutoff } }).exec();
    return result.deletedCount ?? 0;
  }
}
