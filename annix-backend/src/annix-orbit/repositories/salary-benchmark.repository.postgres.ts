import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SalaryBenchmark } from "../entities/salary-benchmark.entity";
import { SalaryBenchmarkRepository } from "./salary-benchmark.repository";

@Injectable()
export class PostgresSalaryBenchmarkRepository
  extends TypeOrmCrudRepository<SalaryBenchmark>
  implements SalaryBenchmarkRepository
{
  constructor(@InjectRepository(SalaryBenchmark) repository: Repository<SalaryBenchmark>) {
    super(repository);
  }

  findByTitleAndProvince(
    normalizedTitle: string,
    province: string,
  ): Promise<SalaryBenchmark | null> {
    return this.repository.findOne({
      where: { normalizedTitle, province },
    });
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.repository.delete({ updatedAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
