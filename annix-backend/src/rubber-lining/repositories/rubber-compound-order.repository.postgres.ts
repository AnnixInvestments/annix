import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  RubberCompoundOrder,
  RubberCompoundOrderStatus,
} from "../entities/rubber-compound-order.entity";
import { RubberCompoundOrderRepository } from "./rubber-compound-order.repository";

@Injectable()
export class PostgresRubberCompoundOrderRepository
  extends TypeOrmCrudRepository<RubberCompoundOrder>
  implements RubberCompoundOrderRepository
{
  constructor(@InjectRepository(RubberCompoundOrder) repository: Repository<RubberCompoundOrder>) {
    super(repository);
  }

  build(data: Partial<RubberCompoundOrder>): RubberCompoundOrder {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompoundOrder>);
  }

  findByStatusWithRelations(status?: RubberCompoundOrderStatus): Promise<RubberCompoundOrder[]> {
    const where = status !== undefined ? { status } : {};
    return this.repository.find({
      where,
      relations: ["compoundStock", "compoundStock.compoundCoding"],
      order: { createdAt: "DESC" },
    });
  }

  findOneByIdWithRelations(id: number): Promise<RubberCompoundOrder | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
  }

  findLastById(): Promise<RubberCompoundOrder | null> {
    return this.repository.createQueryBuilder("order").orderBy("order.id", "DESC").getOne();
  }

  findOneActiveForStock(compoundStockId: number): Promise<RubberCompoundOrder | null> {
    return this.repository.findOne({
      where: {
        compoundStockId,
        status: In([
          RubberCompoundOrderStatus.PENDING,
          RubberCompoundOrderStatus.APPROVED,
          RubberCompoundOrderStatus.ORDERED,
        ]),
      },
    });
  }
}
