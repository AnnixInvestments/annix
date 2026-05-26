import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BoltRepository } from "./bolt.repository";
import { BoltFilters } from "./bolt.service";
import { Bolt } from "./entities/bolt.entity";

@Injectable()
export class PostgresBoltRepository extends TypeOrmCrudRepository<Bolt> implements BoltRepository {
  constructor(@InjectRepository(Bolt) repository: Repository<Bolt>) {
    super(repository);
  }

  async filteredBolts(filters: BoltFilters): Promise<Bolt[]> {
    const query = this.repository.createQueryBuilder("bolt");

    if (filters.grade) {
      query.andWhere("bolt.grade = :grade", { grade: filters.grade });
    }
    if (filters.material) {
      query.andWhere("bolt.material ILIKE :material", {
        material: `%${filters.material}%`,
      });
    }
    if (filters.headStyle) {
      query.andWhere("bolt.head_style = :headStyle", {
        headStyle: filters.headStyle,
      });
    }
    if (filters.size) {
      query.andWhere("bolt.designation LIKE :size", {
        size: `${filters.size}%`,
      });
    }

    return query.orderBy("bolt.designation", "ASC").getMany();
  }

  async boltCategoriesGrouped(): Promise<Array<{ type: string; count: number }>> {
    return this.repository
      .createQueryBuilder("b")
      .select("b.category", "type")
      .addSelect("COUNT(*)", "count")
      .where("b.category IS NOT NULL")
      .groupBy("b.category")
      .getRawMany();
  }

  async fastenerSizesForBolt(type: string): Promise<Array<{ size: string }>> {
    return this.repository
      .createQueryBuilder("b")
      .select("DISTINCT b.designation", "size")
      .where("b.category = :type", { type })
      .orderBy("b.designation", "ASC")
      .getRawMany();
  }

  async fastenerGradesForBolt(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    return this.repository
      .createQueryBuilder("b")
      .select("DISTINCT b.grade", "grade")
      .addSelect("b.material", "material")
      .where("b.category = :type AND b.designation LIKE :size", {
        type,
        size: `${size}%`,
      })
      .getRawMany();
  }
}
