import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { MacroSentimentSnapshot } from "../entities/macro-sentiment-snapshot.entity";
import { MacroSentimentSnapshotRepository } from "./macro-sentiment-snapshot.repository";

@Injectable()
export class PostgresMacroSentimentSnapshotRepository
  extends TypeOrmCrudRepository<MacroSentimentSnapshot>
  implements MacroSentimentSnapshotRepository
{
  constructor(
    @InjectRepository(MacroSentimentSnapshot) repository: Repository<MacroSentimentSnapshot>,
  ) {
    super(repository);
  }

  findByDate(snapshotDate: string): Promise<MacroSentimentSnapshot | null> {
    return this.repository.findOne({ where: { snapshotDate } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  recentHistory(limit: number): Promise<MacroSentimentSnapshot[]> {
    return this.repository.find({
      order: { snapshotDate: "DESC" },
      take: limit,
    });
  }
}
