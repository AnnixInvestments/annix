import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MalleableIronFittingDimension } from "./entities/malleable-iron-fitting-dimension.entity";

@Injectable()
export class MalleableFittingService {
  constructor(
    @InjectRepository(MalleableIronFittingDimension)
    private readonly repo: Repository<MalleableIronFittingDimension>,
  ) {}

  async fittingTypes(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder("d")
      .select("DISTINCT d.fitting_type", "fittingType")
      .orderBy("d.fitting_type", "ASC")
      .getRawMany();
    return rows.map((r) => r.fittingType);
  }

  async dimensions(
    fittingType: string,
    pressureClass?: number,
  ): Promise<MalleableIronFittingDimension[]> {
    const qb = this.repo
      .createQueryBuilder("d")
      .where("d.fitting_type = :fittingType", { fittingType })
      .orderBy("d.nominal_bore_mm", "ASC");

    if (pressureClass !== null && pressureClass !== undefined) {
      qb.andWhere("d.pressure_class = :pressureClass", { pressureClass });
    }

    return qb.getMany();
  }

  async sizes(fittingType: string, pressureClass: number): Promise<number[]> {
    const rows = await this.repo
      .createQueryBuilder("d")
      .select("DISTINCT d.nominal_bore_mm", "nominalBoreMm")
      .where("d.fitting_type = :fittingType", { fittingType })
      .andWhere("d.pressure_class = :pressureClass", { pressureClass })
      .orderBy("d.nominal_bore_mm", "ASC")
      .getRawMany();
    return rows.map((r) => Number(r.nominalBoreMm));
  }

  async dimensionBySize(
    fittingType: string,
    nominalBoreMm: number,
    pressureClass: number,
  ): Promise<MalleableIronFittingDimension | null> {
    return this.repo.findOne({
      where: { fittingType, nominalBoreMm, pressureClass },
    });
  }
}
