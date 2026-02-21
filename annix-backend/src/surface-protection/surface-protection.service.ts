import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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

@Injectable()
export class SurfaceProtectionService {
  constructor(
    @InjectRepository(CoatingSystem)
    private readonly coatingSystemRepo: Repository<CoatingSystem>,
    @InjectRepository(RfqSurfaceProtection)
    private readonly rfqSpRepo: Repository<RfqSurfaceProtection>,
    @InjectRepository(SpCoatingRate)
    private readonly coatingRateRepo: Repository<SpCoatingRate>,
    @InjectRepository(SpLiningRate)
    private readonly liningRateRepo: Repository<SpLiningRate>,
    @InjectRepository(SpSurfacePrepRate)
    private readonly surfacePrepRateRepo: Repository<SpSurfacePrepRate>,
  ) {}

  // Coating System Methods

  async findAllCoatingSystems(): Promise<CoatingSystem[]> {
    return this.coatingSystemRepo.find({
      where: { isActive: true },
      order: { systemCode: "ASC" },
    });
  }

  async findCoatingSystemByCode(systemCode: string): Promise<CoatingSystem | null> {
    return this.coatingSystemRepo.findOne({
      where: { systemCode, isActive: true },
    });
  }

  async findCoatingSystemsByStandard(standard: SystemStandard): Promise<CoatingSystem[]> {
    return this.coatingSystemRepo.find({
      where: { systemStandard: standard, isActive: true },
      order: { systemCode: "ASC" },
    });
  }

  async findCoatingSystemsByApplication(application: SystemApplication): Promise<CoatingSystem[]> {
    return this.coatingSystemRepo.find({
      where: { application, isActive: true },
      order: { systemCode: "ASC" },
    });
  }

  async findRecommendedCoatingSystems(
    corrosivityCategory: string,
    durabilityClass: string,
  ): Promise<CoatingSystem[]> {
    const systems = await this.coatingSystemRepo.find({
      where: { isActive: true, isRecommended: true },
    });

    return systems.filter((system) => {
      const categories = system.corrosivityCategories.split(",").map((c) => c.trim());
      const durabilities = system.durabilityClasses.split(",").map((d) => d.trim());
      return categories.includes(corrosivityCategory) && durabilities.includes(durabilityClass);
    });
  }

  // RFQ Surface Protection Methods

  async findRfqSurfaceProtection(rfqId: number): Promise<RfqSurfaceProtection | null> {
    return this.rfqSpRepo.findOne({
      where: { rfqId },
    });
  }

  async createRfqSurfaceProtection(
    data: Partial<RfqSurfaceProtection>,
  ): Promise<RfqSurfaceProtection> {
    const entity = this.rfqSpRepo.create(data);
    return this.rfqSpRepo.save(entity);
  }

  async updateRfqSurfaceProtection(
    rfqId: number,
    data: Partial<RfqSurfaceProtection>,
  ): Promise<RfqSurfaceProtection | null> {
    const existing = await this.findRfqSurfaceProtection(rfqId);
    if (existing) {
      Object.assign(existing, data);
      return this.rfqSpRepo.save(existing);
    }
    return this.createRfqSurfaceProtection({ ...data, rfqId });
  }

  async deleteRfqSurfaceProtection(rfqId: number): Promise<void> {
    await this.rfqSpRepo.delete({ rfqId });
  }

  // Coating Rate Methods

  async findAllCoatingRates(): Promise<SpCoatingRate[]> {
    return this.coatingRateRepo.find({
      where: { isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  async findCoatingRateByCode(rateCode: string): Promise<SpCoatingRate | null> {
    return this.coatingRateRepo.findOne({
      where: { rateCode, isActive: true },
    });
  }

  async findCoatingRatesByCategory(category: CoatingCategory): Promise<SpCoatingRate[]> {
    return this.coatingRateRepo.find({
      where: { coatingCategory: category, isActive: true },
      order: { totalPricePerM2: "ASC" },
    });
  }

  async findCoatingRatesByISO(
    iso12944Category: ISO12944Category,
    durabilityClass?: DurabilityClass,
  ): Promise<SpCoatingRate[]> {
    const where: any = { iso12944Category, isActive: true };
    if (durabilityClass) {
      where.durabilityClass = durabilityClass;
    }
    return this.coatingRateRepo.find({
      where,
      order: { totalPricePerM2: "ASC" },
    });
  }

  async findCoatingRatesBySupplier(supplierId: number): Promise<SpCoatingRate[]> {
    return this.coatingRateRepo.find({
      where: { supplierId, isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  // Lining Rate Methods

  async findAllLiningRates(): Promise<SpLiningRate[]> {
    return this.liningRateRepo.find({
      where: { isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  async findLiningRateByCode(rateCode: string): Promise<SpLiningRate | null> {
    return this.liningRateRepo.findOne({
      where: { rateCode, isActive: true },
    });
  }

  async findLiningRatesByType(liningType: LiningType): Promise<SpLiningRate[]> {
    return this.liningRateRepo.find({
      where: { liningType, isActive: true },
      order: { totalPricePerM2: "ASC" },
    });
  }

  async findLiningRatesByCategory(category: LiningCategory): Promise<SpLiningRate[]> {
    return this.liningRateRepo.find({
      where: { liningCategory: category, isActive: true },
      order: { thicknessMm: "ASC" },
    });
  }

  async findLiningRatesByThickness(
    category: LiningCategory,
    thicknessMm: number,
  ): Promise<SpLiningRate | null> {
    return this.liningRateRepo.findOne({
      where: { liningCategory: category, thicknessMm, isActive: true },
    });
  }

  async findLiningRatesBySupplier(supplierId: number): Promise<SpLiningRate[]> {
    return this.liningRateRepo.find({
      where: { supplierId, isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  // Surface Prep Rate Methods

  async findAllSurfacePrepRates(): Promise<SpSurfacePrepRate[]> {
    return this.surfacePrepRateRepo.find({
      where: { isActive: true },
      order: { rateCode: "ASC" },
    });
  }

  async findSurfacePrepRateByCode(rateCode: string): Promise<SpSurfacePrepRate | null> {
    return this.surfacePrepRateRepo.findOne({
      where: { rateCode, isActive: true },
    });
  }

  async findSurfacePrepRatesByGrade(grade: SurfacePrepGrade): Promise<SpSurfacePrepRate[]> {
    return this.surfacePrepRateRepo.find({
      where: { prepGrade: grade, isActive: true },
      order: { pricePerM2: "ASC" },
    });
  }

  async findSurfacePrepRatesBySubstrate(
    substrate: SubstrateMaterial,
  ): Promise<SpSurfacePrepRate[]> {
    return this.surfacePrepRateRepo.find({
      where: { substrateMaterial: substrate, isActive: true },
      order: { pricePerM2: "ASC" },
    });
  }

  // Pricing Calculation Methods

  calculateExternalCoatingCost(
    areaM2: number,
    ratePerM2: number,
    shopMultiplier: number,
    fieldMultiplier: number,
    applicationLocation: "shop" | "field" | "both",
  ): number {
    const multiplier =
      applicationLocation === "shop"
        ? shopMultiplier
        : applicationLocation === "field"
          ? fieldMultiplier
          : (shopMultiplier + fieldMultiplier) / 2;
    return areaM2 * ratePerM2 * multiplier;
  }

  calculateInternalLiningCost(
    areaM2: number,
    ratePerM2: number,
    autoclaveMultiplier: number,
    isAutoclave: boolean,
  ): number {
    const multiplier = isAutoclave ? autoclaveMultiplier : 1.0;
    return areaM2 * ratePerM2 * multiplier;
  }

  calculateSurfacePrepCost(
    areaM2: number,
    ratePerM2: number,
    shopMultiplier: number,
    fieldMultiplier: number,
    applicationLocation: "shop" | "field" | "both",
  ): number {
    const multiplier =
      applicationLocation === "shop"
        ? shopMultiplier
        : applicationLocation === "field"
          ? fieldMultiplier
          : (shopMultiplier + fieldMultiplier) / 2;
    return areaM2 * ratePerM2 * multiplier;
  }

  calculateTotalSpCost(
    externalCoatingCost: number,
    internalLiningCost: number,
    surfacePrepCost: number,
    marginPercent: number,
  ): number {
    const subtotal = externalCoatingCost + internalLiningCost + surfacePrepCost;
    return subtotal * (1 + marginPercent / 100);
  }

  // Surface Area Calculation Methods

  calculatePipeSurfaceArea(
    nominalBoreMm: number,
    outsideDiameterMm: number,
    lengthM: number,
    quantity: number,
  ): { internalM2: number; externalM2: number } {
    const internalCircumference = Math.PI * (nominalBoreMm / 1000);
    const externalCircumference = Math.PI * (outsideDiameterMm / 1000);

    return {
      internalM2: internalCircumference * lengthM * quantity,
      externalM2: externalCircumference * lengthM * quantity,
    };
  }

  calculateTotalSurfaceArea(
    items: Array<{ internalM2: number; externalM2: number }>,
    wastagePercent: number,
  ): { totalInternalM2: number; totalExternalM2: number; totalWithWastageM2: number } {
    const totalInternal = items.reduce((sum, item) => sum + item.internalM2, 0);
    const totalExternal = items.reduce((sum, item) => sum + item.externalM2, 0);
    const total = totalInternal + totalExternal;
    const totalWithWastage = total * (1 + wastagePercent / 100);

    return {
      totalInternalM2: totalInternal,
      totalExternalM2: totalExternal,
      totalWithWastageM2: totalWithWastage,
    };
  }

  // Paint Quantity Calculation

  calculatePaintQuantityLiters(
    areaM2: number,
    theoreticalCoverageM2PerLiter: number,
    numberOfCoats: number,
    wastagePercent: number,
  ): number {
    const baseQuantity = (areaM2 / theoreticalCoverageM2PerLiter) * numberOfCoats;
    return baseQuantity * (1 + wastagePercent / 100);
  }
}
