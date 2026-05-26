import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberOrder, RubberOrderStatus } from "../entities/rubber-order.entity";
import { RubberOrderRepository } from "./rubber-order.repository";

const ORDER_RELATIONS = ["company", "items", "items.product"];

@Injectable()
export class PostgresRubberOrderRepository
  extends TypeOrmCrudRepository<RubberOrder>
  implements RubberOrderRepository
{
  constructor(@InjectRepository(RubberOrder) repository: Repository<RubberOrder>) {
    super(repository);
  }

  build(data: Partial<RubberOrder>): RubberOrder {
    return this.repository.create(data as TypeOrmDeepPartial<RubberOrder>);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  findFilteredWithRelations(status?: RubberOrderStatus): Promise<RubberOrder[]> {
    const where = status !== undefined ? { status } : {};
    return this.repository.find({
      where,
      relations: ORDER_RELATIONS,
      order: { createdAt: "DESC" },
    });
  }

  findOneByIdWithRelations(id: number): Promise<RubberOrder | null> {
    return this.repository.findOne({
      where: { id },
      relations: ORDER_RELATIONS,
    });
  }

  findLatest(): Promise<RubberOrder | null> {
    return this.repository.createQueryBuilder("order").orderBy("order.id", "DESC").getOne();
  }
}
