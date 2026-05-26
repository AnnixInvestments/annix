import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Sabs719FittingDimension } from "./entities/sabs719-fitting-dimension.entity";
import { Sabs719FittingDimensionRepository } from "./sabs719-fitting-dimension.repository";

@Injectable()
export class PostgresSabs719FittingDimensionRepository
  extends TypeOrmCrudRepository<Sabs719FittingDimension>
  implements Sabs719FittingDimensionRepository
{
  constructor(
    @InjectRepository(Sabs719FittingDimension) repository: Repository<Sabs719FittingDimension>,
  ) {
    super(repository);
  }

  findByTypeAndDiameter(
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ): Promise<Sabs719FittingDimension | null> {
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
}
