import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlangeBolting } from './entities/flange-bolting.entity';
import { FlangeBoltingMaterial } from './entities/flange-bolting-material.entity';
import { CreateFlangeBoltingDto, CreateFlangeBoltingMaterialDto, BulkCreateFlangeBoltingDto } from './dto/create-flange-bolting.dto';

@Injectable()
export class FlangeBoltingService {
  constructor(
    @InjectRepository(FlangeBolting)
    private readonly boltingRepository: Repository<FlangeBolting>,
    @InjectRepository(FlangeBoltingMaterial)
    private readonly boltingMaterialRepository: Repository<FlangeBoltingMaterial>,
  ) {}

  async createMaterial(dto: CreateFlangeBoltingMaterialDto): Promise<FlangeBoltingMaterial> {
    const entity = this.boltingMaterialRepository.create({
      materialGroup: dto.materialGroup,
      studSpec: dto.studSpec,
      machineBoltSpec: dto.machineBoltSpec,
      nutSpec: dto.nutSpec,
      washerSpec: dto.washerSpec,
    });
    return this.boltingMaterialRepository.save(entity);
  }

  async createBolting(dto: CreateFlangeBoltingDto): Promise<FlangeBolting> {
    const entity = this.boltingRepository.create({
      standardId: dto.standardId,
      pressureClass: dto.pressureClass,
      nps: dto.nps,
      numBolts: dto.numBolts,
      boltDia: dto.boltDia,
      boltLengthDefault: dto.boltLengthDefault || null,
      boltLengthSoSwTh: dto.boltLengthSoSwTh || null,
      boltLengthLj: dto.boltLengthLj || null,
    });
    return this.boltingRepository.save(entity);
  }

  async bulkCreateBolting(dto: BulkCreateFlangeBoltingDto): Promise<FlangeBolting[]> {
    const entities = dto.boltingData.map(data =>
      this.boltingRepository.create({
        standardId: dto.standardId,
        pressureClass: dto.pressureClass,
        nps: data.nps,
        numBolts: data.numBolts,
        boltDia: data.boltDia,
        boltLengthDefault: data.boltLengthDefault || null,
        boltLengthSoSwTh: data.boltLengthSoSwTh || null,
        boltLengthLj: data.boltLengthLj || null,
      })
    );
    return this.boltingRepository.save(entities);
  }

  async findAllMaterials(): Promise<FlangeBoltingMaterial[]> {
    return this.boltingMaterialRepository.find({
      order: { materialGroup: 'ASC' },
    });
  }

  async findMaterialByGroup(materialGroup: string): Promise<FlangeBoltingMaterial | null> {
    return this.boltingMaterialRepository.findOne({
      where: { materialGroup },
    });
  }

  async findAllBolting(): Promise<FlangeBolting[]> {
    return this.boltingRepository.find({
      relations: ['standard'],
      order: { standardId: 'ASC', pressureClass: 'ASC', nps: 'ASC' },
    });
  }

  async findBoltingByStandard(standardId: number): Promise<FlangeBolting[]> {
    return this.boltingRepository.find({
      where: { standardId },
      order: { pressureClass: 'ASC', nps: 'ASC' },
    });
  }

  async findBoltingByStandardAndClass(standardId: number, pressureClass: string): Promise<FlangeBolting[]> {
    return this.boltingRepository.find({
      where: { standardId, pressureClass },
      order: { nps: 'ASC' },
    });
  }

  /**
   * Get bolting requirements for a specific flange configuration
   */
  async getBoltingForFlange(
    standardId: number,
    pressureClass: string,
    nps: string,
  ): Promise<FlangeBolting | null> {
    return this.boltingRepository.findOne({
      where: { standardId, pressureClass, nps },
      relations: ['standard'],
    });
  }

  /**
   * Get bolting material specifications for a material group
   */
  async getBoltingMaterialSpecs(materialGroup: string): Promise<FlangeBoltingMaterial | null> {
    return this.boltingMaterialRepository.findOne({
      where: { materialGroup },
    });
  }

  /**
   * Get complete bolting information including material specs
   */
  async getCompleteBoltingInfo(
    standardId: number,
    pressureClass: string,
    nps: string,
    materialGroup: string = 'Carbon Steel A105 (Group 1.1)',
  ): Promise<{
    bolting: FlangeBolting | null;
    materialSpecs: FlangeBoltingMaterial | null;
  }> {
    const [bolting, materialSpecs] = await Promise.all([
      this.getBoltingForFlange(standardId, pressureClass, nps),
      this.getBoltingMaterialSpecs(materialGroup),
    ]);

    return { bolting, materialSpecs };
  }
}
