import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Bolt } from "../bolt/entities/bolt.entity";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Washer } from "./entities/washer.entity";
import { WasherFilters, WasherRepository } from "./washer.repository";

@Injectable()
export class PostgresWasherRepository
  extends TypeOrmCrudRepository<Washer>
  implements WasherRepository
{
  constructor(
    @InjectRepository(Washer) repository: Repository<Washer>,
    @InjectRepository(Bolt) private readonly boltRepository: Repository<Bolt>,
  ) {
    super(repository);
  }

  async findAllFiltered(filters?: WasherFilters): Promise<Washer[]> {
    const query = this.repository
      .createQueryBuilder("washer")
      .leftJoinAndSelect("washer.bolt", "bolt");

    if (filters?.boltId) {
      query.andWhere("bolt.id = :boltId", { boltId: filters.boltId });
    }
    if (filters?.type) {
      query.andWhere("washer.type = :type", { type: filters.type });
    }
    if (filters?.material) {
      query.andWhere("washer.material ILIKE :material", {
        material: `%${filters.material}%`,
      });
    }

    return query.orderBy("bolt.designation", "ASC").addOrderBy("washer.type", "ASC").getMany();
  }

  findOneWithBolt(id: number): Promise<Washer | null> {
    return this.repository.findOne({ where: { id }, relations: ["bolt"] });
  }

  async findByBoltDesignation(designation: string, type?: string): Promise<Washer[]> {
    const query = this.repository
      .createQueryBuilder("washer")
      .leftJoinAndSelect("washer.bolt", "bolt")
      .where("bolt.designation = :designation", { designation });

    if (type) {
      query.andWhere("washer.type = :type", { type });
    }

    return query.getMany();
  }

  findBoltById(id: number): Promise<Bolt | null> {
    return this.boltRepository.findOne({ where: { id } });
  }

  async typesGrouped(): Promise<Array<{ type: string; count: number }>> {
    return this.repository
      .createQueryBuilder("w")
      .select("w.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("w.type IS NOT NULL")
      .groupBy("w.type")
      .getRawMany();
  }

  async boltDesignationsForType(type: string): Promise<Array<{ size: string }>> {
    return this.repository
      .createQueryBuilder("w")
      .innerJoin("w.bolt", "b")
      .select("DISTINCT b.designation", "size")
      .where("w.type = :type", { type })
      .orderBy("b.designation", "ASC")
      .getRawMany();
  }
}
