import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberAuCocItem } from "../entities/rubber-au-coc-item.entity";
import { RubberAuCocItemRepository } from "./rubber-au-coc-item.repository";

@Injectable()
export class PostgresRubberAuCocItemRepository
  extends TypeOrmCrudRepository<RubberAuCocItem>
  implements RubberAuCocItemRepository
{
  constructor(@InjectRepository(RubberAuCocItem) repository: Repository<RubberAuCocItem>) {
    super(repository);
  }

  build(data: Partial<RubberAuCocItem>): RubberAuCocItem {
    return this.repository.create(data as TypeOrmDeepPartial<RubberAuCocItem>);
  }

  saveMany(entities: RubberAuCocItem[]): Promise<RubberAuCocItem[]> {
    return this.repository.save(entities);
  }

  findByAuCocIdWithRolls(auCocId: number): Promise<RubberAuCocItem[]> {
    return this.repository.find({
      where: { auCocId },
      relations: ["rollStock", "rollStock.compoundCoding"],
    });
  }

  async deleteByAuCocId(auCocId: number): Promise<void> {
    await this.repository.delete({ auCocId });
  }
}
