import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberCompoundStock } from "../entities/rubber-compound-stock.entity";
import { RubberCompoundStockRepository } from "./rubber-compound-stock.repository";

@Injectable()
export class PostgresRubberCompoundStockRepository
  extends TypeOrmCrudRepository<RubberCompoundStock>
  implements RubberCompoundStockRepository
{
  constructor(@InjectRepository(RubberCompoundStock) repository: Repository<RubberCompoundStock>) {
    super(repository);
  }

  build(data: Partial<RubberCompoundStock>): RubberCompoundStock {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompoundStock>);
  }

  findAllWithCodingOrderedById(): Promise<RubberCompoundStock[]> {
    return this.repository.find({
      relations: ["compoundCoding"],
      order: { id: "ASC" },
    });
  }

  findOneByIdWithCoding(id: number): Promise<RubberCompoundStock | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["compoundCoding"],
    });
  }

  findOneByCompoundCodingId(compoundCodingId: number): Promise<RubberCompoundStock | null> {
    return this.repository.findOne({
      where: { compoundCodingId },
    });
  }

  findOneByCompoundCodingIdWithCoding(
    compoundCodingId: number,
  ): Promise<RubberCompoundStock | null> {
    return this.repository.findOne({
      where: { compoundCodingId },
      relations: ["compoundCoding"],
    });
  }

  findLowStockWithCodingOrdered(): Promise<RubberCompoundStock[]> {
    return this.repository
      .createQueryBuilder("stock")
      .leftJoinAndSelect("stock.compoundCoding", "coding")
      .where("stock.quantity_kg < stock.reorder_point_kg")
      .orderBy("stock.quantity_kg", "ASC")
      .getMany();
  }

  findLowStockBelowMinWithCoding(): Promise<RubberCompoundStock[]> {
    return this.repository
      .createQueryBuilder("stock")
      .leftJoinAndSelect("stock.compoundCoding", "coding")
      .where("stock.min_stock_level_kg > 0")
      .andWhere("stock.quantity_kg < stock.min_stock_level_kg")
      .getMany();
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }
}
