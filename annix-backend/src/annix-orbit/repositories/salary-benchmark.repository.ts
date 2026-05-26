import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SalaryBenchmark } from "../entities/salary-benchmark.entity";

export abstract class SalaryBenchmarkRepository extends CrudRepository<SalaryBenchmark> {
  abstract findByTitleAndProvince(
    normalizedTitle: string,
    province: string,
  ): Promise<SalaryBenchmark | null>;
  abstract deleteOlderThan(cutoff: Date): Promise<number>;
}
