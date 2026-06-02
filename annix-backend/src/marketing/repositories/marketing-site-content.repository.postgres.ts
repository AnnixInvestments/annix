import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { MarketingSiteContent } from "../entities/marketing-site-content.entity";
import { MarketingSiteContentRepository } from "./marketing-site-content.repository";

@Injectable()
export class PostgresMarketingSiteContentRepository
  extends TypeOrmCrudRepository<MarketingSiteContent>
  implements MarketingSiteContentRepository
{
  constructor(
    @InjectRepository(MarketingSiteContent) repository: Repository<MarketingSiteContent>,
  ) {
    super(repository);
  }

  build(data: Partial<MarketingSiteContent>): MarketingSiteContent {
    return this.repository.create(data as TypeOrmDeepPartial<MarketingSiteContent>);
  }
}
