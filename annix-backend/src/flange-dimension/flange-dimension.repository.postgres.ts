import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltMass } from "src/bolt-mass/entities/bolt-mass.entity";
import { FlangePressureClass } from "src/flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FlangeDimension } from "./entities/flange-dimension.entity";
import { FlangeDimensionRepository } from "./flange-dimension.repository";

@Injectable()
export class PostgresFlangeDimensionRepository
  extends TypeOrmCrudRepository<FlangeDimension>
  implements FlangeDimensionRepository
{
  constructor(
    @InjectRepository(FlangeDimension) repository: Repository<FlangeDimension>,
    @InjectRepository(NominalOutsideDiameterMm)
    private readonly nominalRepository: Repository<NominalOutsideDiameterMm>,
    @InjectRepository(FlangeStandard)
    private readonly standardRepository: Repository<FlangeStandard>,
    @InjectRepository(FlangePressureClass)
    private readonly pressureRepository: Repository<FlangePressureClass>,
    @InjectRepository(Bolt) private readonly boltRepository: Repository<Bolt>,
    @InjectRepository(BoltMass) private readonly boltMassRepository: Repository<BoltMass>,
  ) {
    super(repository);
  }

  async findAllWithRelations(): Promise<FlangeDimension[]> {
    return this.repository.find({
      relations: ["nominalOutsideDiameter", "standard", "pressureClass", "bolt"],
    });
  }

  async findByIdWithRelations(id: number): Promise<FlangeDimension | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["nominalOutsideDiameter", "standard", "pressureClass", "bolt"],
    });
  }

  async findBySpecs(
    nominalBoreMm: number,
    standardId: number,
    pressureClassId: number,
    flangeTypeId?: number,
  ): Promise<FlangeDimension | null> {
    const whereCondition: any = {
      nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
      standard: { id: standardId },
      pressureClass: { id: pressureClassId },
    };

    if (flangeTypeId) {
      whereCondition.flangeType = { id: flangeTypeId };
    }

    let flange = await this.repository.findOne({
      where: whereCondition,
      relations: ["nominalOutsideDiameter", "standard", "pressureClass", "flangeType", "bolt"],
    });

    if (!flange && flangeTypeId) {
      flange = await this.repository.findOne({
        where: {
          nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
          standard: { id: standardId },
          pressureClass: { id: pressureClassId },
        },
        relations: ["nominalOutsideDiameter", "standard", "pressureClass", "flangeType", "bolt"],
      });
    }

    return flange || null;
  }

  async findByCodeAndDesignation(
    nbMm: number,
    code: string,
    designation: string,
  ): Promise<FlangeDimension | null> {
    return this.repository.findOne({
      where: {
        nominalOutsideDiameter: { nominal_diameter_mm: nbMm },
        standard: { code },
        pressureClass: { designation },
      },
      relations: ["nominalOutsideDiameter", "standard", "pressureClass"],
    });
  }

  async findClosestBoltMass(boltId: number, lengthMm: number): Promise<BoltMass | null> {
    return this.boltMassRepository
      .createQueryBuilder("bm")
      .where('bm."boltId" = :boltId', { boltId })
      .orderBy("ABS(bm.length_mm - :length)", "ASC")
      .setParameter("length", lengthMm)
      .getOne();
  }

  async findNominalById(id: number): Promise<NominalOutsideDiameterMm | null> {
    return this.nominalRepository.findOne({ where: { id } });
  }

  async findStandardById(id: number): Promise<FlangeStandard | null> {
    return this.standardRepository.findOne({ where: { id } });
  }

  async findPressureClassById(id: number): Promise<FlangePressureClass | null> {
    return this.pressureRepository.findOne({ where: { id } });
  }

  async findBoltById(id: number): Promise<Bolt | null> {
    return this.boltRepository.findOne({ where: { id } });
  }

  async findBoltMassByBoltAndLength(boltId: number, lengthMm: number): Promise<BoltMass | null> {
    return this.boltMassRepository.findOne({
      where: {
        bolt: { id: boltId },
        length_mm: lengthMm,
      },
    });
  }

  async existsByAllFields(params: {
    nominalOutsideDiameterId: number;
    standardId: number;
    pressureClassId: number;
    D: number;
    b: number;
    d4: number;
    f: number;
    num_holes: number;
    d1: number;
    pcd: number;
    mass_kg: number;
    bolt?: Bolt | null;
  }): Promise<boolean> {
    const existing = await this.repository.findOne({
      where: {
        nominalOutsideDiameter: { id: params.nominalOutsideDiameterId },
        standard: { id: params.standardId },
        pressureClass: { id: params.pressureClassId },
        D: params.D,
        b: params.b,
        d4: params.d4,
        f: params.f,
        num_holes: params.num_holes,
        d1: params.d1,
        pcd: params.pcd,
        mass_kg: params.mass_kg,
        bolt: params.bolt ?? undefined,
      },
      relations: ["nominalOutsideDiameter", "standard", "pressureClass", "bolt"],
    });
    return !!existing;
  }

  findByNominalDiameterStandardAndPressureClassWithBolt(
    nominalDiameterMm: number,
    standardId: number,
    pressureClassId: number,
  ): Promise<FlangeDimension | null> {
    return this.repository.findOne({
      where: {
        nominalOutsideDiameter: { nominal_diameter_mm: nominalDiameterMm },
        standard: { id: standardId },
        pressureClass: { id: pressureClassId },
      },
      relations: ["bolt", "nominalOutsideDiameter"],
    });
  }
}
