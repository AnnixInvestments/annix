import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { Asset } from "../entities/asset.entity";
import { AssetRepository } from "./asset.repository";

@Injectable()
export class PostgresAssetRepository
  extends TypeOrmCrudRepository<Asset>
  implements AssetRepository
{
  constructor(@InjectRepository(Asset) repository: Repository<Asset>) {
    super(repository);
  }

  findBySymbol(symbol: string): Promise<Asset | null> {
    return this.repository.findOne({ where: { symbol } });
  }

  findActive(): Promise<Asset[]> {
    return this.repository.find({ where: { isActive: true } });
  }

  async updateById(id: string, changes: Partial<Asset>): Promise<void> {
    await this.repository.update({ id }, changes);
  }
}
