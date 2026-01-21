import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFlangeDimensionDto } from './dto/create-flange-dimension.dto';
import { UpdateFlangeDimensionDto } from './dto/update-flange-dimension.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FlangeDimension } from './entities/flange-dimension.entity';
import { NominalOutsideDiameterMm } from 'src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FlangeStandard } from 'src/flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from 'src/flange-pressure-class/entities/flange-pressure-class.entity';
import { Bolt } from 'src/bolt/entities/bolt.entity';
import { BoltMass } from 'src/bolt-mass/entities/bolt-mass.entity';
import { Repository } from 'typeorm';

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
  constructor(
    @InjectRepository(FlangeDimension)
    private readonly flangeRepo: Repository<FlangeDimension>,
    @InjectRepository(NominalOutsideDiameterMm)
    private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
    @InjectRepository(FlangeStandard)
    private readonly standardRepo: Repository<FlangeStandard>,
    @InjectRepository(FlangePressureClass)
    private readonly pressureRepo: Repository<FlangePressureClass>,
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
    @InjectRepository(BoltMass) private readonly boltMassRepo: Repository<BoltMass>,
  ) {}

  async create(dto: CreateFlangeDimensionDto): Promise<FlangeDimension> {
    const nominal = await this.nominalRepo.findOne({
      where: { id: dto.nominalOutsideDiameterId },
    });
    if (!nominal)
      throw new NotFoundException(
        `NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`,
      );

    const standard = await this.standardRepo.findOne({
      where: { id: dto.standardId },
    });
    if (!standard)
      throw new NotFoundException(`FlangeStandard ${dto.standardId} not found`);

    const pressure = await this.pressureRepo.findOne({
      where: { id: dto.pressureClassId },
    });
    if (!pressure)
      throw new NotFoundException(
        `FlangePressureClass ${dto.pressureClassId} not found`,
      );

    let bolt: Bolt | null = null;
    if (dto.boltId) {
      bolt = await this.boltRepo.findOne({ where: { id: dto.boltId } });
      if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);
    }

    const exists = await this.flangeRepo.findOne({
      where: {
        nominalOutsideDiameter: { id: dto.nominalOutsideDiameterId },
        standard: { id: dto.standardId },
        pressureClass: { id: dto.pressureClassId },
        D: dto.D,
        b: dto.b,
        d4: dto.d4,
        f: dto.f,
        num_holes: dto.num_holes,
        d1: dto.d1,
        pcd: dto.pcd,
        mass_kg: dto.mass_kg,
        bolt: bolt ?? undefined,
      },
      relations: [
        'nominalOutsideDiameter',
        'standard',
        'pressureClass',
        'bolt',
      ],
    });

    if (exists)
      throw new BadRequestException('Flange dimension already exists');

    const flange = this.flangeRepo.create({
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

    return this.flangeRepo.save(flange);
  }

  async findAll(): Promise<FlangeDimension[]> {
    return this.flangeRepo.find({
      relations: [
        'nominalOutsideDiameter',
        'standard',
        'pressureClass',
        'bolt',
      ],
    });
  }

  async findOne(id: number): Promise<FlangeDimension> {
    const flange = await this.flangeRepo.findOne({
      where: { id },
      relations: [
        'nominalOutsideDiameter',
        'standard',
        'pressureClass',
        'bolt',
      ],
    });
    if (!flange) throw new NotFoundException(`FlangeDimension ${id} not found`);
    return flange;
  }

  async update(
    id: number,
    dto: UpdateFlangeDimensionDto,
  ): Promise<FlangeDimension> {
    const flange = await this.findOne(id);

    if (dto.nominalOutsideDiameterId) {
      const nominal = await this.nominalRepo.findOne({
        where: { id: dto.nominalOutsideDiameterId },
      });
      if (!nominal)
        throw new NotFoundException(
          `NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`,
        );
      flange.nominalOutsideDiameter = nominal;
    }

    if (dto.standardId) {
      const standard = await this.standardRepo.findOne({
        where: { id: dto.standardId },
      });
      if (!standard)
        throw new NotFoundException(
          `FlangeStandard ${dto.standardId} not found`,
        );
      flange.standard = standard;
    }

    if (dto.pressureClassId) {
      const pressure = await this.pressureRepo.findOne({
        where: { id: dto.pressureClassId },
      });
      if (!pressure)
        throw new NotFoundException(
          `FlangePressureClass ${dto.pressureClassId} not found`,
        );
      flange.pressureClass = pressure;
    }

    if (dto.boltId) {
      const bolt = await this.boltRepo.findOne({ where: { id: dto.boltId } });
      if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);
      flange.bolt = bolt;
    }

    Object.assign(flange, dto);

    return this.flangeRepo.save(flange);
  }

  async remove(id: number): Promise<void> {
    const flange = await this.findOne(id);
    await this.flangeRepo.remove(flange);
  }

  async findBySpecs(
    nominalBoreMm: number,
    standardId: number,
    pressureClassId: number,
    flangeTypeId?: number,
  ): Promise<any> {
    const whereCondition: any = {
      nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
      standard: { id: standardId },
      pressureClass: { id: pressureClassId },
    };

    if (flangeTypeId) {
      whereCondition.flangeType = { id: flangeTypeId };
    }

    let flange = await this.flangeRepo.findOne({
      where: whereCondition,
      relations: [
        'nominalOutsideDiameter',
        'standard',
        'pressureClass',
        'flangeType',
        'bolt',
      ],
    });

    if (!flange && flangeTypeId) {
      flange = await this.flangeRepo.findOne({
        where: {
          nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
          standard: { id: standardId },
          pressureClass: { id: pressureClassId },
        },
        relations: [
          'nominalOutsideDiameter',
          'standard',
          'pressureClass',
          'flangeType',
          'bolt',
        ],
      });
    }

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
      const threadPitch = ISO_METRIC_THREAD_PITCHES[diameterMm] || 2.0;
      const lengthMm = flange.boltLengthMm || 70;

      let massKg = 0;
      const boltMass = await this.boltMassRepo.findOne({
        where: {
          bolt: { id: flange.bolt.id },
          length_mm: lengthMm,
        },
      });

      if (boltMass) {
        massKg = boltMass.mass_kg;
      } else {
        const closestMass = await this.boltMassRepo
          .createQueryBuilder('bm')
          .where('bm."boltId" = :boltId', { boltId: flange.bolt.id })
          .orderBy('ABS(bm.length_mm - :length)', 'ASC')
          .setParameter('length', lengthMm)
          .getOne();
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

  private extractDiameterFromDesignation(designation: string): number {
    const match = designation.match(/M(\d+)/i);
    return match ? parseInt(match[1], 10) : 16;
  }
}
