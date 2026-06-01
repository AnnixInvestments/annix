import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerUsageCounter } from "../entities/seeker-usage-counter.entity";
import { SeekerUsageCounterRepository } from "./seeker-usage-counter.repository";

@Injectable()
export class PostgresSeekerUsageCounterRepository
  extends TypeOrmCrudRepository<SeekerUsageCounter>
  implements SeekerUsageCounterRepository
{
  constructor(@InjectRepository(SeekerUsageCounter) repository: Repository<SeekerUsageCounter>) {
    super(repository);
  }

  async getCount(subjectId: string, operation: string, monthKey: string): Promise<number> {
    const row = await this.repository.findOne({ where: { subjectId, operation, monthKey } });
    return row ? row.count : 0;
  }

  async increment(subjectId: string, operation: string, monthKey: string): Promise<void> {
    const existing = await this.repository.findOne({ where: { subjectId, operation, monthKey } });
    if (existing) {
      existing.count += 1;
      await this.repository.save(existing);
      return;
    }
    await this.repository.save(
      this.repository.create({ subjectId, operation, monthKey, count: 1 }),
    );
  }
}
