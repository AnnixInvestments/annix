import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SweepTeeDimension } from "./entities/sweep-tee-dimension.entity";
import { SweepTeeDimensionRepository } from "./sweep-tee-dimension.repository";

@Injectable()
export class PostgresSweepTeeDimensionRepository
  extends TypeOrmCrudRepository<SweepTeeDimension>
  implements SweepTeeDimensionRepository
{
  constructor(@InjectRepository(SweepTeeDimension) repository: Repository<SweepTeeDimension>) {
    super(repository);
  }

  findAllOrdered(): Promise<SweepTeeDimension[]> {
    return this.repository.find({
      order: {
        nominalBoreMm: "ASC",
        radiusType: "ASC",
      },
    });
  }

  findByNominalBore(nominalBoreMm: number): Promise<SweepTeeDimension[]> {
    return this.repository.find({
      where: { nominalBoreMm },
      order: {
        radiusType: "ASC",
      },
    });
  }

  findByRadiusType(radiusType: string): Promise<SweepTeeDimension[]> {
    return this.repository.find({
      where: { radiusType },
      order: {
        nominalBoreMm: "ASC",
      },
    });
  }

  findByCriteria(nominalBoreMm: number, radiusType: string): Promise<SweepTeeDimension | null> {
    return this.repository.findOne({
      where: {
        nominalBoreMm,
        radiusType,
      },
    });
  }

  async availableNominalBores(): Promise<number[]> {
    const result = await this.repository
      .createQueryBuilder("st")
      .select("DISTINCT st.nominalBoreMm", "nominalBoreMm")
      .orderBy("st.nominalBoreMm", "ASC")
      .getRawMany();

    return result.map((r) => r.nominalBoreMm);
  }

  async availableRadiusTypes(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder("st")
      .select("DISTINCT st.radiusType", "radiusType")
      .getRawMany();

    return result.map((r) => r.radiusType).sort();
  }
}
