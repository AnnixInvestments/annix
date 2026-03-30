import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ForgedFittingDimension } from "./entities/forged-fitting-dimension.entity";
import { ForgedFittingSeries } from "./entities/forged-fitting-series.entity";
import { ForgedFittingType } from "./entities/forged-fitting-type.entity";

@Injectable()
export class ForgedFittingService {
  constructor(
    @InjectRepository(ForgedFittingDimension)
    private readonly dimensionRepo: Repository<ForgedFittingDimension>,
    @InjectRepository(ForgedFittingSeries)
    private readonly seriesRepo: Repository<ForgedFittingSeries>,
    @InjectRepository(ForgedFittingType)
    private readonly typeRepo: Repository<ForgedFittingType>,
  ) {}

  async fittingTypes(): Promise<{ code: string; name: string }[]> {
    const types = await this.typeRepo.find({ order: { name: "ASC" } });
    return types.map((t) => ({ code: t.code, name: t.name }));
  }

  async seriesList(): Promise<{ id: number; pressureClass: number; connectionType: string }[]> {
    const series = await this.seriesRepo.find({
      order: { pressureClass: "ASC", connectionType: "ASC" },
    });
    return series.map((s) => ({
      id: s.id,
      pressureClass: s.pressureClass,
      connectionType: s.connectionType,
    }));
  }

  async sizes(
    fittingTypeCode: string,
    pressureClass: number,
    connectionType: string,
  ): Promise<number[]> {
    const rows = await this.dimensionRepo
      .createQueryBuilder("d")
      .innerJoin("d.fittingType", "t")
      .innerJoin("d.series", "s")
      .select("DISTINCT d.nominal_bore_mm", "nominalBoreMm")
      .where("t.code = :code", { code: fittingTypeCode })
      .andWhere("s.pressure_class = :pressureClass", { pressureClass })
      .andWhere("s.connection_type = :connectionType", { connectionType })
      .orderBy("d.nominal_bore_mm", "ASC")
      .getRawMany();
    return rows.map((r) => Number(r.nominalBoreMm));
  }

  async dimensions(
    fittingTypeCode: string,
    nominalBoreMm: number,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension | null> {
    return (
      this.dimensionRepo
        .createQueryBuilder("d")
        .innerJoin("d.fittingType", "t")
        .innerJoin("d.series", "s")
        .where("t.code = :code", { code: fittingTypeCode })
        .andWhere("d.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
        .andWhere("s.pressure_class = :pressureClass", { pressureClass })
        .andWhere("s.connection_type = :connectionType", { connectionType })
        .getOne() || null
    );
  }

  async allDimensions(
    fittingTypeCode: string,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension[]> {
    return this.dimensionRepo
      .createQueryBuilder("d")
      .innerJoin("d.fittingType", "t")
      .innerJoin("d.series", "s")
      .where("t.code = :code", { code: fittingTypeCode })
      .andWhere("s.pressure_class = :pressureClass", { pressureClass })
      .andWhere("s.connection_type = :connectionType", { connectionType })
      .orderBy("d.nominal_bore_mm", "ASC")
      .getMany();
  }
}
