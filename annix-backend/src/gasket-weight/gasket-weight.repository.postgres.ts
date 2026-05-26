import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { GasketWeight } from "./entities/gasket-weight.entity";
import { GasketWeightRepository } from "./gasket-weight.repository";

@Injectable()
export class PostgresGasketWeightRepository
  extends TypeOrmCrudRepository<GasketWeight>
  implements GasketWeightRepository
{
  constructor(
    @InjectRepository(GasketWeight) repository: Repository<GasketWeight>,
    @InjectRepository(FlangeDimension)
    private readonly flangeDimensionRepo: Repository<FlangeDimension>,
  ) {
    super(repository);
  }

  findAllGaskets(): Promise<GasketWeight[]> {
    return this.repository.find();
  }

  findGasketByTypeAndBore(gasketType: string, nominalBoreMm: number): Promise<GasketWeight | null> {
    return this.repository.findOne({
      where: {
        gasket_type: gasketType.toUpperCase(),
        nominal_bore_mm: nominalBoreMm,
      },
    });
  }

  findFlangeDimension(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeDimension | null> {
    const query = this.flangeDimensionRepo
      .createQueryBuilder("fd")
      .leftJoinAndSelect("fd.nominalOutsideDiameter", "nb")
      .leftJoinAndSelect("fd.pressureClass", "pc")
      .leftJoinAndSelect("fd.standard", "std")
      .where("nb.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("pc.designation = :pressureClass", { pressureClass });

    if (flangeStandardCode) {
      query.andWhere("std.code = :flangeStandardCode", { flangeStandardCode });
    }

    return query.getOne();
  }

  findFlangeDimensionWithBolt(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeDimension | null> {
    const query = this.flangeDimensionRepo
      .createQueryBuilder("fd")
      .leftJoinAndSelect("fd.nominalOutsideDiameter", "nb")
      .leftJoinAndSelect("fd.pressureClass", "pc")
      .leftJoinAndSelect("fd.standard", "std")
      .leftJoinAndSelect("fd.bolt", "bolt")
      .where("nb.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("pc.designation = :pressureClass", { pressureClass });

    if (flangeStandardCode) {
      query.andWhere("std.code = :flangeStandardCode", { flangeStandardCode });
    }

    return query.getOne();
  }

  distinctGasketTypes(): Promise<{ type: string }[]> {
    return this.repository
      .createQueryBuilder("gasket")
      .select("DISTINCT gasket.gasket_type", "type")
      .orderBy("gasket.gasket_type", "ASC")
      .getRawMany();
  }
}
