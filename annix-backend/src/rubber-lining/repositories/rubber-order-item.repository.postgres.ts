import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberOrderItem } from "../entities/rubber-order-item.entity";
import { RubberOrderItemRepository } from "./rubber-order-item.repository";

@Injectable()
export class PostgresRubberOrderItemRepository
  extends TypeOrmCrudRepository<RubberOrderItem>
  implements RubberOrderItemRepository
{
  constructor(@InjectRepository(RubberOrderItem) repository: Repository<RubberOrderItem>) {
    super(repository);
  }

  build(data: Partial<RubberOrderItem>): RubberOrderItem {
    return this.repository.create(data as TypeOrmDeepPartial<RubberOrderItem>);
  }

  saveMany(entities: RubberOrderItem[]): Promise<RubberOrderItem[]> {
    return this.repository.save(entities);
  }

  async deleteByOrderId(orderId: number): Promise<void> {
    await this.repository.delete({ orderId });
  }
}
