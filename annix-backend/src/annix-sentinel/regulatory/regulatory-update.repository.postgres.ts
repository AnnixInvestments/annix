import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelRegulatoryUpdate } from "./entities/regulatory-update.entity";
import { AnnixSentinelRegulatoryUpdateRepository } from "./regulatory-update.repository";

@Injectable()
export class PostgresAnnixSentinelRegulatoryUpdateRepository
  extends TypeOrmCrudRepository<AnnixSentinelRegulatoryUpdate>
  implements AnnixSentinelRegulatoryUpdateRepository
{
  constructor(
    @InjectRepository(AnnixSentinelRegulatoryUpdate)
    repository: Repository<AnnixSentinelRegulatoryUpdate>,
  ) {
    super(repository);
  }

  findRecent(limit: number): Promise<AnnixSentinelRegulatoryUpdate[]> {
    return this.repository.find({
      order: { publishedAt: "DESC" },
      take: limit,
    });
  }

  findByCategoryNewestFirst(category: string): Promise<AnnixSentinelRegulatoryUpdate[]> {
    return this.repository.find({
      where: { category },
      order: { publishedAt: "DESC" },
    });
  }

  async recentTitles(limit: number): Promise<string[]> {
    const rows = await this.repository.find({
      select: ["title"],
      order: { publishedAt: "DESC" },
      take: limit,
    });
    return rows.map((row) => row.title);
  }
}
