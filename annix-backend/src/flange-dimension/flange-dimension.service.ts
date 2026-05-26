import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { CreateFlangeDimensionDto } from "./dto/create-flange-dimension.dto";
import { UpdateFlangeDimensionDto } from "./dto/update-flange-dimension.dto";
import { FlangeDimension } from "./entities/flange-dimension.entity";
import { FlangeDimensionRepository } from "./flange-dimension.repository";

const ISO_METRIC_THREAD_PITCHES: Record<number, number> = {
  12: 1.75,
  14: 2.0,
  16: 2.0,
  18: 2.5,
  20: 2.5,
  22: 2.5,
  24: 3.0,
  27: 3.0,
  30: 3.5,
  33: 3.5,
  36: 4.0,
  39: 4.0,
  42: 4.5,
  45: 4.5,
  48: 5.0,
  52: 5.0,
  56: 5.5,
  60: 5.5,
  64: 6.0,
};

@Injectable()
export class FlangeDimensionService {
  private findAllCache: FlangeDimension[] | null = null;

  constructor(private readonly flangeRepository: FlangeDimensionRepository) {}

  private invalidateCache(): void {
    this.findAllCache = null;
  }

  async create(dto: CreateFlangeDimensionDto): Promise<FlangeDimension> {
    const nominal = await this.flangeRepository.findNominalById(dto.nominalOutsideDiameterId);
    if (!nominal)
      throw new NotFoundException(
        `NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`,
      );

    const standard = await this.flangeRepository.findStandardById(dto.standardId);
    if (!standard) throw new NotFoundException(`FlangeStandard ${dto.standardId} not found`);

    const pressure = await this.flangeRepository.findPressureClassById(dto.pressureClassId);
    if (!pressure)
      throw new NotFoundException(`FlangePressureClass ${dto.pressureClassId} not found`);

    let bolt: Bolt | null = null;
    if (dto.boltId) {
      bolt = await this.flangeRepository.findBoltById(dto.boltId);
      if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);
    }

    const exists = await this.flangeRepository.existsByAllFields({
      nominalOutsideDiameterId: dto.nominalOutsideDiameterId,
      standardId: dto.standardId,
      pressureClassId: dto.pressureClassId,
      D: dto.D,
      b: dto.b,
      d4: dto.d4,
      f: dto.f,
      num_holes: dto.num_holes,
      d1: dto.d1,
      pcd: dto.pcd,
      mass_kg: dto.mass_kg,
      bolt,
    });

    if (exists) throw new BadRequestException("Flange dimension already exists");

    const saved = await this.flangeRepository.create({
      nominalOutsideDiameter: nominal,
      standard,
      pressureClass: pressure,
      bolt: bolt ?? undefined,
      D: dto.D,
      b: dto.b,
      d4: dto.d4,
      f: dto.f,
      num_holes: dto.num_holes,
      d1: dto.d1,
      pcd: dto.pcd,
      mass_kg: dto.mass_kg,
    });
    this.invalidateCache();
    return saved;
  }

  async findAll(): Promise<FlangeDimension[]> {
    if (this.findAllCache) {
      return this.findAllCache;
    }
    const result = await this.flangeRepository.findAllWithRelations();
    this.findAllCache = result;
    return result;
  }

  async findOne(id: number): Promise<FlangeDimension> {
    const flange = await this.flangeRepository.findByIdWithRelations(id);
    if (!flange) throw new NotFoundException(`FlangeDimension ${id} not found`);
    return flange;
  }

  async update(id: number, dto: UpdateFlangeDimensionDto): Promise<FlangeDimension> {
    const flange = await this.findOne(id);

    if (dto.nominalOutsideDiameterId) {
      const nominal = await this.flangeRepository.findNominalById(dto.nominalOutsideDiameterId);
      if (!nominal)
        throw new NotFoundException(
          `NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`,
        );
      flange.nominalOutsideDiameter = nominal;
    }

    if (dto.standardId) {
      const standard = await this.flangeRepository.findStandardById(dto.standardId);
      if (!standard) throw new NotFoundException(`FlangeStandard ${dto.standardId} not found`);
      flange.standard = standard;
    }

    if (dto.pressureClassId) {
      const pressure = await this.flangeRepository.findPressureClassById(dto.pressureClassId);
      if (!pressure)
        throw new NotFoundException(`FlangePressureClass ${dto.pressureClassId} not found`);
      flange.pressureClass = pressure;
    }

    if (dto.boltId) {
      const bolt = await this.flangeRepository.findBoltById(dto.boltId);
      if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);
      flange.bolt = bolt;
    }

    Object.assign(flange, dto);

    const saved = await this.flangeRepository.save(flange);
    this.invalidateCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const flange = await this.findOne(id);
    await this.flangeRepository.remove(flange);
    this.invalidateCache();
  }

  async findBySpecs(
    nominalBoreMm: number,
    standardId: number,
    pressureClassId: number,
    flangeTypeId?: number,
  ): Promise<any> {
    const flange = await this.flangeRepository.findBySpecs(
      nominalBoreMm,
      standardId,
      pressureClassId,
      flangeTypeId,
    );

    if (!flange) {
      return null;
    }

    return this.transformFlangeWithBoltData(flange);
  }

  private async transformFlangeWithBoltData(flange: FlangeDimension): Promise<any> {
    const result: any = {
      id: flange.id,
      D: flange.D,
      b: flange.b,
      d4: flange.d4,
      f: flange.f,
      num_holes: flange.num_holes,
      d1: flange.d1,
      pcd: flange.pcd,
      mass_kg: flange.mass_kg,
      nominalOutsideDiameter: flange.nominalOutsideDiameter,
      standard: flange.standard,
      pressureClass: flange.pressureClass,
      flangeType: flange.flangeType,
    };

    if (flange.bolt) {
      const diameterMm = this.extractDiameterFromDesignation(flange.bolt.designation);
      const threadPitch = flange.bolt.threadPitchMm || ISO_METRIC_THREAD_PITCHES[diameterMm] || 2.0;
      const lengthMm = flange.boltLengthMm || 70;

      let massKg = 0;
      const boltMass = await this.flangeRepository.findBoltMassByBoltAndLength(
        flange.bolt.id,
        lengthMm,
      );

      if (boltMass) {
        massKg = boltMass.mass_kg;
      } else {
        const closestMass = await this.flangeRepository.findClosestBoltMass(
          flange.bolt.id,
          lengthMm,
        );
        massKg = closestMass?.mass_kg || 0;
      }

      result.bolt = {
        id: flange.bolt.id,
        diameter_mm: diameterMm,
        thread_pitch: threadPitch,
        length_mm: lengthMm,
        mass_kg: massKg,
      };
    }

    return result;
  }

  async flangeDimensionsForM2(
    nbMm: number,
    standardCode?: string | null,
    classDesignation?: string | null,
  ): Promise<{ D: number; d4: number; b: number } | null> {
    const standardCodes = standardCode ? [standardCode] : ["SABS 1123", "ASME B16.5", "BS 4504"];

    const defaultClasses: Record<string, string[]> = {
      "SABS 1123": ["1000", "1600"],
      "ASME B16.5": ["150", "300"],
      "BS 4504": ["PN16", "PN25"],
    };

    for (const code of standardCodes) {
      const designations = classDesignation ? [classDesignation] : defaultClasses[code] || [];

      for (const designation of designations) {
        const flange = await this.flangeRepository.findByCodeAndDesignation(
          nbMm,
          code,
          designation,
        );

        if (flange) {
          return { D: flange.D, d4: flange.d4, b: flange.b };
        }
      }
    }

    return null;
  }

  private extractDiameterFromDesignation(designation: string): number {
    const match = designation.match(/M(\d+)/i);
    return match ? parseInt(match[1], 10) : 16;
  }
}
