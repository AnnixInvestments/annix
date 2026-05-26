import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { WatchlistItem } from "../entities/watchlist-item.entity";
import { WatchlistItemRepository } from "./watchlist-item.repository";

@Injectable()
export class PostgresWatchlistItemRepository
  extends TypeOrmCrudRepository<WatchlistItem>
  implements WatchlistItemRepository
{
  constructor(@InjectRepository(WatchlistItem) repository: Repository<WatchlistItem>) {
    super(repository);
  }

  findAllWithAsset(): Promise<WatchlistItem[]> {
    return this.repository.find({
      relations: { asset: true },
      order: { addedAt: "DESC" },
    });
  }

  findByAssetId(assetId: string): Promise<WatchlistItem | null> {
    return this.repository.findOne({ where: { assetId } });
  }

  findByIdWithAsset(id: string): Promise<WatchlistItem | null> {
    return this.repository.findOne({
      where: { id },
      relations: { asset: true },
    });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return !!result.affected;
  }
}
