import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MalleableIronFittingDimension } from "./entities/malleable-iron-fitting-dimension.entity";
import { MalleableFittingRepository } from "./malleable-fitting.repository";

@Injectable()
export class PostgresMalleableFittingRepository
  extends TypeOrmCrudRepository<MalleableIronFittingDimension>
  implements MalleableFittingRepository
{
  constructor(
    @InjectRepository(MalleableIronFittingDimension)
    repository: Repository<MalleableIronFittingDimension>,
  ) {
    super(repository);
  }

  distinctFittingTypes(): Promise<{ fittingType: string }[]> {
    return this.repository
      .createQueryBuilder("d")
      .select("DISTINCT d.fitting_type", "fittingType")
      .orderBy("d.fitting_type", "ASC")
      .getRawMany();
  }

  async dimensionsByType(
    fittingType: string,
    pressureClass?: number,
  ): Promise<MalleableIronFittingDimension[]> {
    const qb = this.repository
      .createQueryBuilder("d")
      .where("d.fitting_type = :fittingType", { fittingType })
      .orderBy("d.nominal_bore_mm", "ASC");

    if (pressureClass !== null && pressureClass !== undefined) {
      qb.andWhere("d.pressure_class = :pressureClass", { pressureClass });
    }

    return qb.getMany();
  }

  sizesByTypeAndClass(
    fittingType: string,
    pressureClass: number,
  ): Promise<{ nominalBoreMm: number }[]> {
    return this.repository
      .createQueryBuilder("d")
      .select("DISTINCT d.nominal_bore_mm", "nominalBoreMm")
      .where("d.fitting_type = :fittingType", { fittingType })
      .andWhere("d.pressure_class = :pressureClass", { pressureClass })
      .orderBy("d.nominal_bore_mm", "ASC")
      .getRawMany();
  }

  findByTypeAndSize(
    fittingType: string,
    nominalBoreMm: number,
    pressureClass: number,
  ): Promise<MalleableIronFittingDimension | null> {
    return this.repository.findOne({
      where: { fittingType, nominalBoreMm, pressureClass },
    });
  }
}
