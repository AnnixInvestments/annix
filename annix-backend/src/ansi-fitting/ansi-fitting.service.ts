import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnsiB169FittingDimension } from "./entities/ansi-b16-9-fitting-dimension.entity";
import { AnsiB169FittingType } from "./entities/ansi-b16-9-fitting-type.entity";

@Injectable()
export class AnsiFittingService {
  constructor(
    @InjectRepository(AnsiB169FittingDimension)
    private readonly dimensionRepo: Repository<AnsiB169FittingDimension>,
    @InjectRepository(AnsiB169FittingType)
    private readonly typeRepo: Repository<AnsiB169FittingType>,
  ) {}

  async fittingTypes(): Promise<{ code: string; name: string }[]> {
    const types = await this.typeRepo.find({ order: { name: "ASC" } });
    return types.map((t) => ({ code: t.code, name: t.name }));
  }

  async sizes(fittingTypeCode: string, schedule?: string): Promise<number[]> {
    const qb = this.dimensionRepo
      .createQueryBuilder("d")
      .innerJoin("d.fittingType", "t")
      .select("DISTINCT d.nb_mm", "nbMm")
      .where("t.code = :code", { code: fittingTypeCode })
      .orderBy("d.nb_mm", "ASC");

    if (schedule) {
      qb.andWhere("d.schedule = :schedule", { schedule });
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => Number(r.nbMm));
  }

  async schedules(fittingTypeCode: string): Promise<string[]> {
    const rows = await this.dimensionRepo
      .createQueryBuilder("d")
      .innerJoin("d.fittingType", "t")
      .select("DISTINCT d.schedule", "schedule")
      .where("t.code = :code", { code: fittingTypeCode })
      .orderBy("d.schedule", "ASC")
      .getRawMany();
    return rows.map((r) => r.schedule);
  }

  async dimensions(
    fittingTypeCode: string,
    nbMm: number,
    schedule: string,
    branchNbMm?: number,
  ): Promise<AnsiB169FittingDimension | null> {
    const qb = this.dimensionRepo
      .createQueryBuilder("d")
      .innerJoin("d.fittingType", "t")
      .where("t.code = :code", { code: fittingTypeCode })
      .andWhere("d.nb_mm = :nbMm", { nbMm })
      .andWhere("d.schedule = :schedule", { schedule });

    if (branchNbMm !== null && branchNbMm !== undefined) {
      qb.andWhere("d.branch_od_mm IS NOT NULL");
      const branchRow = await this.dimensionRepo
        .createQueryBuilder("d2")
        .innerJoin("d2.fittingType", "t2")
        .where("t2.code = :code", { code: fittingTypeCode })
        .andWhere("d2.nb_mm = :nbMm", { nbMm })
        .andWhere("d2.schedule = :schedule", { schedule })
        .andWhere(
          "CAST(COALESCE(d2.branch_nps, '0') AS decimal) = (SELECT CAST(nps AS decimal) FROM nb_nps_lookup WHERE nb_mm = :branchNbMm LIMIT 1)",
          { branchNbMm },
        )
        .getOne();
      return branchRow || null;
    }

    qb.andWhere("d.branch_nps IS NULL");
    return qb.getOne() || null;
  }

  async allDimensions(
    fittingTypeCode: string,
    schedule: string,
  ): Promise<AnsiB169FittingDimension[]> {
    return this.dimensionRepo
      .createQueryBuilder("d")
      .innerJoin("d.fittingType", "t")
      .where("t.code = :code", { code: fittingTypeCode })
      .andWhere("d.schedule = :schedule", { schedule })
      .orderBy("d.nb_mm", "ASC")
      .getMany();
  }
}
