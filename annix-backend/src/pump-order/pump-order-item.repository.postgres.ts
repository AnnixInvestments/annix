import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PumpOrderItem } from "./entities/pump-order-item.entity";
import { PumpOrderItemRepository } from "./pump-order-item.repository";

@Injectable()
export class PostgresPumpOrderItemRepository
  extends TypeOrmCrudRepository<PumpOrderItem>
  implements PumpOrderItemRepository
{
  constructor(@InjectRepository(PumpOrderItem) repository: Repository<PumpOrderItem>) {
    super(repository);
  }

  async deleteByOrderId(orderId: number): Promise<void> {
    await this.repository.delete({ orderId });
  }

  async saveMany(items: DeepPartial<PumpOrderItem>[]): Promise<PumpOrderItem[]> {
    const entities = items.map((item) =>
      this.repository.create(item as Parameters<typeof this.repository.create>[0]),
    );
    return this.repository.save(entities);
  }
}
