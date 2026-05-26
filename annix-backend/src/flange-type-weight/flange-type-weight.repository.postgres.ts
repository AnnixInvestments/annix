import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";

@Injectable()
export class PostgresFlangeTypeWeightRepository
  extends TypeOrmCrudRepository<FlangeTypeWeight>
  implements FlangeTypeWeightRepository
{
  constructor(@InjectRepository(FlangeTypeWeight) repository: Repository<FlangeTypeWeight>) {
    super(repository);
  }

  findAllWithStandard(): Promise<FlangeTypeWeight[]> {
    return this.repository.find({ relations: ["flangeStandard"] });
  }

  async findFlangeTypeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeTypeCode: string,
    flangeStandardCode: string | null,
  ): Promise<FlangeTypeWeight | null> {
    const query = this.repository
      .createQueryBuilder("ftw")
      .leftJoinAndSelect("ftw.flangeStandard", "fs")
      .where("ftw.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("ftw.pressure_class = :pressureClass", { pressureClass })
      .andWhere("ftw.flange_type_code = :flangeTypeCode", { flangeTypeCode });

    if (flangeStandardCode) {
      query.andWhere("fs.code = :flangeStandardCode", { flangeStandardCode });
    } else {
      query.andWhere("ftw.flange_standard_id IS NULL");
    }

    return query.getOne();
  }

  findBlankFlangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
  ): Promise<FlangeTypeWeight | null> {
    return this.repository
      .createQueryBuilder("ftw")
      .where("ftw.nominal_bore_mm = :nominalBoreMm", { nominalBoreMm })
      .andWhere("ftw.pressure_class = :pressureClass", { pressureClass })
      .andWhere("ftw.flange_type_code = :flangeTypeCode", { flangeTypeCode: "BLANK" })
      .andWhere("ftw.flange_standard_id IS NULL")
      .getOne();
  }

  distinctPressureClasses(): Promise<{ pressureClass: string }[]> {
    return this.repository
      .createQueryBuilder("ftw")
      .select("DISTINCT ftw.pressure_class", "pressureClass")
      .orderBy("ftw.pressure_class", "ASC")
      .getRawMany<{ pressureClass: string }>();
  }

  distinctFlangeTypeCodes(): Promise<{ flangeTypeCode: string }[]> {
    return this.repository
      .createQueryBuilder("ftw")
      .select("DISTINCT ftw.flange_type_code", "flangeTypeCode")
      .orderBy("ftw.flange_type_code", "ASC")
      .getRawMany<{ flangeTypeCode: string }>();
  }
}
