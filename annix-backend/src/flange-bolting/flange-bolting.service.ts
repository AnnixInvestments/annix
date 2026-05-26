import { Injectable } from "@nestjs/common";
import {
  BulkCreateFlangeBoltingDto,
  CreateFlangeBoltingDto,
  CreateFlangeBoltingMaterialDto,
} from "./dto/create-flange-bolting.dto";
import { FlangeBolting } from "./entities/flange-bolting.entity";
import { FlangeBoltingMaterial } from "./entities/flange-bolting-material.entity";
import {
  FlangeBoltingMaterialRepository,
  FlangeBoltingRepository,
} from "./flange-bolting.repository";

@Injectable()
export class FlangeBoltingService {
  constructor(
    private readonly boltingRepository: FlangeBoltingRepository,
    private readonly boltingMaterialRepository: FlangeBoltingMaterialRepository,
  ) {}

  async createMaterial(dto: CreateFlangeBoltingMaterialDto): Promise<FlangeBoltingMaterial> {
    return this.boltingMaterialRepository.create({
      materialGroup: dto.materialGroup,
      studSpec: dto.studSpec,
      machineBoltSpec: dto.machineBoltSpec,
      nutSpec: dto.nutSpec,
      washerSpec: dto.washerSpec,
    });
  }

  async createBolting(dto: CreateFlangeBoltingDto): Promise<FlangeBolting> {
    return this.boltingRepository.create({
      standardId: dto.standardId,
      pressureClass: dto.pressureClass,
      nps: dto.nps,
      numBolts: dto.numBolts,
      boltDia: dto.boltDia,
      boltLengthDefault: dto.boltLengthDefault || null,
      boltLengthSoSwTh: dto.boltLengthSoSwTh || null,
      boltLengthLj: dto.boltLengthLj || null,
    });
  }

  async bulkCreateBolting(dto: BulkCreateFlangeBoltingDto): Promise<FlangeBolting[]> {
    const entities = dto.boltingData.map((data) => ({
      standardId: dto.standardId,
      pressureClass: dto.pressureClass,
      nps: data.nps,
      numBolts: data.numBolts,
      boltDia: data.boltDia,
      boltLengthDefault: data.boltLengthDefault || null,
      boltLengthSoSwTh: data.boltLengthSoSwTh || null,
      boltLengthLj: data.boltLengthLj || null,
    }));
    return this.boltingRepository.saveMany(entities as FlangeBolting[]);
  }

  async findAllMaterials(): Promise<FlangeBoltingMaterial[]> {
    return this.boltingMaterialRepository.findAllOrderedByGroup();
  }

  async findMaterialByGroup(materialGroup: string): Promise<FlangeBoltingMaterial | null> {
    return this.boltingMaterialRepository.findByMaterialGroup(materialGroup);
  }

  async findAllBolting(): Promise<FlangeBolting[]> {
    return this.boltingRepository.findAllWithStandard();
  }

  async findBoltingByStandard(standardId: number): Promise<FlangeBolting[]> {
    return this.boltingRepository.findByStandardId(standardId);
  }

  async findBoltingByStandardAndClass(
    standardId: number,
    pressureClass: string,
  ): Promise<FlangeBolting[]> {
    return this.boltingRepository.findByStandardAndClass(standardId, pressureClass);
  }

  async getBoltingForFlange(
    standardId: number,
    pressureClass: string,
    nps: string,
  ): Promise<FlangeBolting | null> {
    return this.boltingRepository.findByStandardClassAndNps(standardId, pressureClass, nps);
  }

  async getBoltingMaterialSpecs(materialGroup: string): Promise<FlangeBoltingMaterial | null> {
    return this.boltingMaterialRepository.findByMaterialGroup(materialGroup);
  }

  async getCompleteBoltingInfo(
    standardId: number,
    pressureClass: string,
    nps: string,
    materialGroup: string = "Carbon Steel A105 (Group 1.1)",
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
