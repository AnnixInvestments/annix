import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Sabs62FittingDimension } from "./entities/sabs62-fitting-dimension.entity";
import { Sabs62FittingDimensionRepository } from "./sabs62-fitting-dimension.repository";

@Injectable()
export class PostgresSabs62FittingDimensionRepository
  extends TypeOrmCrudRepository<Sabs62FittingDimension>
  implements Sabs62FittingDimensionRepository
{
  constructor(
    @InjectRepository(Sabs62FittingDimension) repository: Repository<Sabs62FittingDimension>,
  ) {
    super(repository);
  }

  findByTypeAndDiameter(
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ): Promise<Sabs62FittingDimension | null> {
    const queryBuilder = this.repository
      .createQueryBuilder("fitting")
      .where("fitting.fittingType = :fittingType", { fittingType })
      .andWhere("fitting.nominalDiameterMm = :nominalDiameterMm", {
        nominalDiameterMm,
      });

    if (angleRange) {
      queryBuilder.andWhere("fitting.angleRange = :angleRange", { angleRange });
    }

    return queryBuilder.getOne();
  }

  async distinctFittingTypes(): Promise<string[]> {
    const types = await this.repository
      .createQueryBuilder("fitting")
      .select("DISTINCT fitting.fittingType", "fittingType")
      .getRawMany();
    return types.map((t) => t.fittingType);
  }

  async distinctSizes(fittingType: string): Promise<number[]> {
    const sizes = await this.repository
      .createQueryBuilder("fitting")
      .select("DISTINCT fitting.nominalDiameterMm", "nominalDiameterMm")
      .where("fitting.fittingType = :fittingType", { fittingType })
      .orderBy("fitting.nominalDiameterMm", "ASC")
      .getRawMany();
    return sizes.map((s) => parseFloat(s.nominalDiameterMm));
  }

  async distinctAngleRanges(fittingType: string, nominalDiameterMm: number): Promise<string[]> {
    const angleRanges = await this.repository
      .createQueryBuilder("fitting")
      .select("DISTINCT fitting.angleRange", "angleRange")
      .where("fitting.fittingType = :fittingType", { fittingType })
      .andWhere("fitting.nominalDiameterMm = :nominalDiameterMm", {
        nominalDiameterMm,
      })
      .andWhere("fitting.angleRange IS NOT NULL")
      .getRawMany();
    return angleRanges.map((a) => a.angleRange).filter(Boolean);
  }
}
