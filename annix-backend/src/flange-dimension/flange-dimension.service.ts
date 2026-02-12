import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFlangeDimensionDto } from './dto/create-flange-dimension.dto';
import { UpdateFlangeDimensionDto } from './dto/update-flange-dimension.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FlangeDimension } from './entities/flange-dimension.entity';
import { NominalOutsideDiameterMm } from 'src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FlangeStandard } from 'src/flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from 'src/flange-pressure-class/entities/flange-pressure-class.entity';
import { Bolt } from 'src/bolt/entities/bolt.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FlangeDimensionService {
  constructor(
    @InjectRepository(FlangeDimension) private readonly flangeRepo: Repository<FlangeDimension>,
    @InjectRepository(NominalOutsideDiameterMm) private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
    @InjectRepository(FlangeStandard) private readonly standardRepo: Repository<FlangeStandard>,
    @InjectRepository(FlangePressureClass) private readonly pressureRepo: Repository<FlangePressureClass>,
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
  ) {}

  async create(dto: CreateFlangeDimensionDto): Promise<FlangeDimension> {
    const nominal = await this.nominalRepo.findOne({ where: { id: dto.nominalOutsideDiameterId } });
    if (!nominal) throw new NotFoundException(`NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`);

    const standard = await this.standardRepo.findOne({ where: { id: dto.standardId } });
    if (!standard) throw new NotFoundException(`FlangeStandard ${dto.standardId} not found`);

    const pressure = await this.pressureRepo.findOne({ where: { id: dto.pressureClassId } });
    if (!pressure) throw new NotFoundException(`FlangePressureClass ${dto.pressureClassId} not found`);

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
      relations: ['nominalOutsideDiameter', 'standard', 'pressureClass', 'bolt'],
    });

    if (exists) throw new BadRequestException('Flange dimension already exists');

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
      relations: ['nominalOutsideDiameter', 'standard', 'pressureClass', 'bolt'],
    });
  }

  async findOne(id: number): Promise<FlangeDimension> {
    const flange = await this.flangeRepo.findOne({
      where: { id },
      relations: ['nominalOutsideDiameter', 'standard', 'pressureClass', 'bolt'],
    });
    if (!flange) throw new NotFoundException(`FlangeDimension ${id} not found`);
    return flange;
  }

  async update(id: number, dto: UpdateFlangeDimensionDto): Promise<FlangeDimension> {
    const flange = await this.findOne(id);

    if (dto.nominalOutsideDiameterId) {
      const nominal = await this.nominalRepo.findOne({ where: { id: dto.nominalOutsideDiameterId } });
      if (!nominal) throw new NotFoundException(`NominalOutsideDiameter ${dto.nominalOutsideDiameterId} not found`);
      flange.nominalOutsideDiameter = nominal;
    }

    if (dto.standardId) {
      const standard = await this.standardRepo.findOne({ where: { id: dto.standardId } });
      if (!standard) throw new NotFoundException(`FlangeStandard ${dto.standardId} not found`);
      flange.standard = standard;
    }

    if (dto.pressureClassId) {
      const pressure = await this.pressureRepo.findOne({ where: { id: dto.pressureClassId } });
      if (!pressure) throw new NotFoundException(`FlangePressureClass ${dto.pressureClassId} not found`);
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
}
