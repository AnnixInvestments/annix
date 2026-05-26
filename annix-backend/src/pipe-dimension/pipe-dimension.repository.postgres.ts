import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { SteelSpecification } from "src/steel-specification/entities/steel-specification.entity";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PipeDimension } from "./entities/pipe-dimension.entity";
import { PipeDimensionRepository } from "./pipe-dimension.repository";

@Injectable()
export class PostgresPipeDimensionRepository
  extends TypeOrmCrudRepository<PipeDimension>
  implements PipeDimensionRepository
{
  constructor(
    @InjectRepository(PipeDimension) repository: Repository<PipeDimension>,
    @InjectRepository(NominalOutsideDiameterMm)
    private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
    @InjectRepository(SteelSpecification)
    private readonly steelRepo: Repository<SteelSpecification>,
  ) {
    super(repository);
  }

  findAllWithRelations(): Promise<PipeDimension[]> {
    return this.repository.find({
      relations: ["nominalOutsideDiameter", "steelSpecification", "pressures"],
    });
  }

  findAllWithDiameterAndSpec(): Promise<PipeDimension[]> {
    return this.repository.find({
      relations: ["nominalOutsideDiameter", "steelSpecification"],
    });
  }

  findOneWithRelations(id: number): Promise<PipeDimension | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["nominalOutsideDiameter", "steelSpecification", "pressures"],
    });
  }

  findNominalByDiameter(nominalDiameterMm: number): Promise<NominalOutsideDiameterMm | null> {
    return this.nominalRepo.findOne({ where: { nominal_diameter_mm: nominalDiameterMm } });
  }

  findNominalById(id: number): Promise<NominalOutsideDiameterMm | null> {
    return this.nominalRepo.findOne({ where: { id } });
  }

  findSteelById(id: number): Promise<SteelSpecification | null> {
    return this.steelRepo.findOne({ where: { id } });
  }

  async createPipe(data: Partial<PipeDimension>): Promise<PipeDimension> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  savePipe(entity: PipeDimension): Promise<PipeDimension> {
    return this.repository.save(entity);
  }

  async removePipe(entity: PipeDimension): Promise<void> {
    await this.repository.remove(entity);
  }

  findBySpecAndNominal(steelSpecId: number, nominalId: number): Promise<PipeDimension[]> {
    return this.repository.find({
      where: {
        steelSpecification: { id: steelSpecId },
        nominalOutsideDiameter: { id: nominalId },
      },
      relations: ["nominalOutsideDiameter", "steelSpecification", "pressures"],
      order: { wall_thickness_mm: "ASC" },
    });
  }

  async recommendedSpecs(
    nominalId: number,
    workingPressureMpa: number,
    temperature: number,
    steelSpecId?: number,
  ): Promise<PipeDimension[]> {
    let query = this.repository
      .createQueryBuilder("pipe")
      .leftJoinAndSelect("pipe.nominalOutsideDiameter", "nominal")
      .leftJoinAndSelect("pipe.steelSpecification", "steel")
      .leftJoinAndSelect("pipe.pressures", "pressure")
      .where("nominal.id = :nominalId", { nominalId });

    if (steelSpecId) {
      query = query.andWhere("steel.id = :steelSpecId", { steelSpecId });
    }

    query = query
      .andWhere("pressure.temperature_c IS NOT NULL")
      .andWhere("pressure.temperature_c >= :temperature", { temperature })
      .andWhere("pressure.max_working_pressure_mpa IS NOT NULL")
      .andWhere("pressure.max_working_pressure_mpa >= :workingPressureMpa", {
        workingPressureMpa,
      });

    return query.getMany();
  }

  async higherSchedules(
    nominalId: number,
    currentWallThickness: number,
    workingPressureMpa: number,
    temperature: number,
    steelSpecId?: number,
  ): Promise<PipeDimension[]> {
    let query = this.repository
      .createQueryBuilder("pipe")
      .leftJoinAndSelect("pipe.nominalOutsideDiameter", "nominal")
      .leftJoinAndSelect("pipe.steelSpecification", "steel")
      .leftJoinAndSelect("pipe.pressures", "pressure")
      .where("nominal.id = :nominalId", { nominalId })
      .andWhere("pipe.wall_thickness_mm > :currentWallThickness", { currentWallThickness })
      .andWhere("pressure.temperature_c IS NOT NULL")
      .andWhere("pressure.temperature_c >= :temperature", { temperature })
      .andWhere("pressure.max_working_pressure_mpa IS NOT NULL")
      .andWhere("pressure.max_working_pressure_mpa >= :workingPressureMpa", {
        workingPressureMpa,
      });

    if (steelSpecId) {
      query = query.andWhere("steel.id = :steelSpecId", { steelSpecId });
    }

    return query.getMany();
  }

  findByNominalDiameterScheduleAndSteel(
    nominalDiameterMm: number,
    scheduleDesignation: string,
    steelSpecId?: number,
  ): Promise<PipeDimension | null> {
    return this.repository.findOne({
      where: {
        nominalOutsideDiameter: { nominal_diameter_mm: nominalDiameterMm },
        schedule_designation: scheduleDesignation,
        ...(steelSpecId ? { steelSpecification: { id: steelSpecId } } : {}),
      },
      relations: ["nominalOutsideDiameter", "steelSpecification"],
    });
  }
}
