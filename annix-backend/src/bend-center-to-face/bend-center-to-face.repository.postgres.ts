import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { BendCenterToFaceRepository } from "./bend-center-to-face.repository";
import { BendCenterToFace } from "./entities/bend-center-to-face.entity";

@Injectable()
export class PostgresBendCenterToFaceRepository
  extends TypeOrmCrudRepository<BendCenterToFace>
  implements BendCenterToFaceRepository
{
  constructor(
    @InjectRepository(BendCenterToFace) repository: Repository<BendCenterToFace>,
    @InjectRepository(PipeDimension)
    private readonly pipeDimensionRepository: Repository<PipeDimension>,
    @InjectRepository(FlangeDimension)
    private readonly flangeDimensionRepository: Repository<FlangeDimension>,
  ) {
    super(repository);
  }

  async findAllOrdered(): Promise<BendCenterToFace[]> {
    return this.repository.find({
      order: {
        bendType: "ASC",
        nominalBoreMm: "ASC",
        degrees: "ASC",
      },
    });
  }

  async findByBendType(bendType: string): Promise<BendCenterToFace[]> {
    return this.repository.find({
      where: { bendType },
      order: {
        nominalBoreMm: "ASC",
        degrees: "ASC",
      },
    });
  }

  async findByNominalBore(nominalBoreMm: number): Promise<BendCenterToFace[]> {
    return this.repository.find({
      where: { nominalBoreMm },
      order: {
        bendType: "ASC",
        degrees: "ASC",
      },
    });
  }

  async findByCriteria(
    bendType: string,
    nominalBoreMm: number,
    degrees: number,
  ): Promise<BendCenterToFace | null> {
    return this.repository.findOne({
      where: {
        bendType,
        nominalBoreMm,
        degrees,
      },
    });
  }

  async findByBendTypeAndNominalBoreOrdered(
    bendType: string,
    nominalBoreMm: number,
  ): Promise<BendCenterToFace[]> {
    return this.repository.find({
      where: {
        bendType,
        nominalBoreMm,
      },
      order: {
        degrees: "ASC",
      },
    });
  }

  async distinctBendTypes(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder("bend")
      .select("DISTINCT bend.bendType", "bendType")
      .getRawMany();

    return result.map((r) => r.bendType).sort();
  }

  async distinctNominalBoresForBendType(bendType: string): Promise<number[]> {
    const result = await this.repository
      .createQueryBuilder("bend")
      .select("DISTINCT bend.nominalBoreMm", "nominalBoreMm")
      .where("bend.bendType = :bendType", { bendType })
      .orderBy("bend.nominalBoreMm", "ASC")
      .getRawMany();

    return result.map((r) => r.nominalBoreMm);
  }

  async distinctDegreesForBendType(bendType: string, nominalBoreMm?: number): Promise<number[]> {
    const qb = this.repository
      .createQueryBuilder("bend")
      .select("DISTINCT bend.degrees", "degrees")
      .where("bend.bendType = :bendType", { bendType });

    if (typeof nominalBoreMm === "number") {
      qb.andWhere("bend.nominalBoreMm = :nominalBoreMm", { nominalBoreMm });
    }

    const result = await qb.orderBy("degrees", "ASC").getRawMany();

    return result.map((r) => Number(r.degrees));
  }

  async findPipeDimension(
    nominalBoreMm: number,
    wallThicknessMm: number,
  ): Promise<PipeDimension | null> {
    return this.pipeDimensionRepository.findOne({
      where: {
        nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
        wall_thickness_mm: wallThicknessMm,
      },
      relations: ["nominalOutsideDiameter"],
    });
  }

  async findFlangeDimension(
    nominalBoreMm: number,
    flangeStandardId: number,
    flangePressureClassId: number,
  ): Promise<FlangeDimension | null> {
    return this.flangeDimensionRepository.findOne({
      where: {
        nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
        standard: { id: flangeStandardId },
        pressureClass: { id: flangePressureClassId },
      },
      relations: ["nominalOutsideDiameter", "standard", "pressureClass"],
    });
  }
}
