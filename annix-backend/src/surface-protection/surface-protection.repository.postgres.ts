import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CoatingSystem, SystemApplication, SystemStandard } from "./entities/coating-system.entity";
import { RfqSurfaceProtection } from "./entities/rfq-surface-protection.entity";
import {
  CoatingCategory,
  DurabilityClass,
  ISO12944Category,
  SpCoatingRate,
} from "./entities/sp-coating-rate.entity";
import { LiningCategory, LiningType, SpLiningRate } from "./entities/sp-lining-rate.entity";
import {
  SpSurfacePrepRate,
  SubstrateMaterial,
  SurfacePrepGrade,
} from "./entities/sp-surface-prep-rate.entity";
import { SurfaceProtectionRepository } from "./surface-protection.repository";

@Injectable()
export class PostgresSurfaceProtectionRepository
  extends TypeOrmCrudRepository<CoatingSystem>
  implements SurfaceProtectionRepository
{
  constructor(
    @InjectRepository(CoatingSystem) repository: Repository<CoatingSystem>,
    @InjectRepository(RfqSurfaceProtection)
    private readonly rfqSpRepository: Repository<RfqSurfaceProtection>,
    @InjectRepository(SpCoatingRate)
    private readonly coatingRateRepository: Repository<SpCoatingRate>,
    @InjectRepository(SpLiningRate)
    private readonly liningRateRepository: Repository<SpLiningRate>,
    @InjectRepository(SpSurfacePrepRate)
    private readonly surfacePrepRateRepository: Repository<SpSurfacePrepRate>,
  ) {
    super(repository);
  }

  findAllActiveCoatingSystems(): Promise<CoatingSystem[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { systemCode: "ASC" },
    });
  }

  findCoatingSystemByCode(systemCode: string): Promise<CoatingSystem | null> {
    return this.repository.findOne({
      where: { systemCode, isActive: true },
    });
  }

  findCoatingSystemsByStandard(standard: SystemStandard): Promise<CoatingSystem[]> {
    return this.repository.find({
      where: { systemStandard: standard, isActive: true },
      order: { systemCode: "ASC" },
    });
  }

  findCoatingSystemsByApplication(application: SystemApplication): Promise<CoatingSystem[]> {
    return this.repository.find({
      where: { application, isActive: true },
      order: { systemCode: "ASC" },
    });
  }

  findRecommendedCoatingSystems(): Promise<CoatingSystem[]> {
    return this.repository.find({
      where: { isActive: true, isRecommended: true },
    });
  }

  findRfqSurfaceProtection(rfqId: number): Promise<RfqSurfaceProtection | null> {
    return this.rfqSpRepository.findOne({
      where: { rfqId },
    });
  }

  async createRfqSurfaceProtection(
    data: Partial<RfqSurfaceProtection>,
  ): Promise<RfqSurfaceProtection> {
    const entity = this.rfqSpRepository.create(data);
    return this.rfqSpRepository.save(entity);
  }

  saveRfqSurfaceProtection(entity: RfqSurfaceProtection): Promise<RfqSurfaceProtection> {
    return this.rfqSpRepository.save(entity);
  }

  async deleteRfqSurfaceProtection(rfqId: number): Promise<void> {
    await this.rfqSpRepository.delete({ rfqId });
  }

  findAllActiveCoatingRates(): Promise<SpCoatingRate[]> {
    return this.coatingRateRepository.find({
      where: { isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  findCoatingRateByCode(rateCode: string): Promise<SpCoatingRate | null> {
    return this.coatingRateRepository.findOne({
      where: { rateCode, isActive: true },
    });
  }

  findCoatingRatesByCategory(category: CoatingCategory): Promise<SpCoatingRate[]> {
    return this.coatingRateRepository.find({
      where: { coatingCategory: category, isActive: true },
      order: { totalPricePerM2: "ASC" },
    });
  }

  findCoatingRatesByISO(
    iso12944Category: ISO12944Category,
    durabilityClass?: DurabilityClass,
  ): Promise<SpCoatingRate[]> {
    const where: any = { iso12944Category, isActive: true };
    if (durabilityClass) {
      where.durabilityClass = durabilityClass;
    }
    return this.coatingRateRepository.find({
      where,
      order: { totalPricePerM2: "ASC" },
    });
  }

  findCoatingRatesBySupplier(supplierId: number): Promise<SpCoatingRate[]> {
    return this.coatingRateRepository.find({
      where: { supplierId, isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  findAllActiveLiningRates(): Promise<SpLiningRate[]> {
    return this.liningRateRepository.find({
      where: { isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  findLiningRateByCode(rateCode: string): Promise<SpLiningRate | null> {
    return this.liningRateRepository.findOne({
      where: { rateCode, isActive: true },
    });
  }

  findLiningRatesByType(liningType: LiningType): Promise<SpLiningRate[]> {
    return this.liningRateRepository.find({
      where: { liningType, isActive: true },
      order: { totalPricePerM2: "ASC" },
    });
  }

  findLiningRatesByCategory(category: LiningCategory): Promise<SpLiningRate[]> {
    return this.liningRateRepository.find({
      where: { liningCategory: category, isActive: true },
      order: { thicknessMm: "ASC" },
    });
  }

  findLiningRateByThickness(
    category: LiningCategory,
    thicknessMm: number,
  ): Promise<SpLiningRate | null> {
    return this.liningRateRepository.findOne({
      where: { liningCategory: category, thicknessMm, isActive: true },
    });
  }

  findLiningRatesBySupplier(supplierId: number): Promise<SpLiningRate[]> {
    return this.liningRateRepository.find({
      where: { supplierId, isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  findAllActiveSurfacePrepRates(): Promise<SpSurfacePrepRate[]> {
    return this.surfacePrepRateRepository.find({
      where: { isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  findSurfacePrepRateByCode(rateCode: string): Promise<SpSurfacePrepRate | null> {
    return this.surfacePrepRateRepository.findOne({
      where: { rateCode, isActive: true },
    });
  }

  findSurfacePrepRatesByGrade(grade: SurfacePrepGrade): Promise<SpSurfacePrepRate[]> {
    return this.surfacePrepRateRepository.find({
      where: { prepGrade: grade, isActive: true },
      order: { pricePerM2: "ASC" },
    });
  }

  findSurfacePrepRatesBySubstrate(substrate: SubstrateMaterial): Promise<SpSurfacePrepRate[]> {
    return this.surfacePrepRateRepository.find({
      where: { substrateMaterial: substrate, isActive: true },
      order: { pricePerM2: "ASC" },
    });
  }
}
