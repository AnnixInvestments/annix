import { Injectable } from "@nestjs/common";
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
export class SurfaceProtectionService {
  constructor(private readonly surfaceProtectionRepository: SurfaceProtectionRepository) {}

  async findAllCoatingSystems(): Promise<CoatingSystem[]> {
    return this.surfaceProtectionRepository.findAllActiveCoatingSystems();
  }

  async findCoatingSystemByCode(systemCode: string): Promise<CoatingSystem | null> {
    return this.surfaceProtectionRepository.findCoatingSystemByCode(systemCode);
  }

  async findCoatingSystemsByStandard(standard: SystemStandard): Promise<CoatingSystem[]> {
    return this.surfaceProtectionRepository.findCoatingSystemsByStandard(standard);
  }

  async findCoatingSystemsByApplication(application: SystemApplication): Promise<CoatingSystem[]> {
    return this.surfaceProtectionRepository.findCoatingSystemsByApplication(application);
  }

  async findRecommendedCoatingSystems(
    corrosivityCategory: string,
    durabilityClass: string,
  ): Promise<CoatingSystem[]> {
    const systems = await this.surfaceProtectionRepository.findRecommendedCoatingSystems();

    return systems.filter((system) => {
      const categories = system.corrosivityCategories.split(",").map((c) => c.trim());
      const durabilities = system.durabilityClasses.split(",").map((d) => d.trim());
      return categories.includes(corrosivityCategory) && durabilities.includes(durabilityClass);
    });
  }

  async findRfqSurfaceProtection(rfqId: number): Promise<RfqSurfaceProtection | null> {
    return this.surfaceProtectionRepository.findRfqSurfaceProtection(rfqId);
  }

  async createRfqSurfaceProtection(
    data: Partial<RfqSurfaceProtection>,
  ): Promise<RfqSurfaceProtection> {
    return this.surfaceProtectionRepository.createRfqSurfaceProtection(data);
  }

  async updateRfqSurfaceProtection(
    rfqId: number,
    data: Partial<RfqSurfaceProtection>,
  ): Promise<RfqSurfaceProtection | null> {
    const existing = await this.findRfqSurfaceProtection(rfqId);
    if (existing) {
      Object.assign(existing, data);
      return this.surfaceProtectionRepository.saveRfqSurfaceProtection(existing);
    }
    return this.surfaceProtectionRepository.createRfqSurfaceProtection({ ...data, rfqId });
  }

  async deleteRfqSurfaceProtection(rfqId: number): Promise<void> {
    await this.surfaceProtectionRepository.deleteRfqSurfaceProtection(rfqId);
  }

  async findAllCoatingRates(): Promise<SpCoatingRate[]> {
    return this.surfaceProtectionRepository.findAllActiveCoatingRates();
  }

  async findCoatingRateByCode(rateCode: string): Promise<SpCoatingRate | null> {
    return this.surfaceProtectionRepository.findCoatingRateByCode(rateCode);
  }

  async findCoatingRatesByCategory(category: CoatingCategory): Promise<SpCoatingRate[]> {
    return this.surfaceProtectionRepository.findCoatingRatesByCategory(category);
  }

  async findCoatingRatesByISO(
    iso12944Category: ISO12944Category,
    durabilityClass?: DurabilityClass,
  ): Promise<SpCoatingRate[]> {
    return this.surfaceProtectionRepository.findCoatingRatesByISO(
      iso12944Category,
      durabilityClass,
    );
  }

  async findCoatingRatesBySupplier(supplierId: number): Promise<SpCoatingRate[]> {
    return this.surfaceProtectionRepository.findCoatingRatesBySupplier(supplierId);
  }

  async findAllLiningRates(): Promise<SpLiningRate[]> {
    return this.surfaceProtectionRepository.findAllActiveLiningRates();
  }

  async findLiningRateByCode(rateCode: string): Promise<SpLiningRate | null> {
    return this.surfaceProtectionRepository.findLiningRateByCode(rateCode);
  }

  async findLiningRatesByType(liningType: LiningType): Promise<SpLiningRate[]> {
    return this.surfaceProtectionRepository.findLiningRatesByType(liningType);
  }

  async findLiningRatesByCategory(category: LiningCategory): Promise<SpLiningRate[]> {
    return this.surfaceProtectionRepository.findLiningRatesByCategory(category);
  }

  async findLiningRatesByThickness(
    category: LiningCategory,
    thicknessMm: number,
  ): Promise<SpLiningRate | null> {
    return this.surfaceProtectionRepository.findLiningRateByThickness(category, thicknessMm);
  }

  async findLiningRatesBySupplier(supplierId: number): Promise<SpLiningRate[]> {
    return this.surfaceProtectionRepository.findLiningRatesBySupplier(supplierId);
  }

  async findAllSurfacePrepRates(): Promise<SpSurfacePrepRate[]> {
    return this.surfaceProtectionRepository.findAllActiveSurfacePrepRates();
  }

  async findSurfacePrepRateByCode(rateCode: string): Promise<SpSurfacePrepRate | null> {
    return this.surfaceProtectionRepository.findSurfacePrepRateByCode(rateCode);
  }

  async findSurfacePrepRatesByGrade(grade: SurfacePrepGrade): Promise<SpSurfacePrepRate[]> {
    return this.surfaceProtectionRepository.findSurfacePrepRatesByGrade(grade);
  }

  async findSurfacePrepRatesBySubstrate(
    substrate: SubstrateMaterial,
  ): Promise<SpSurfacePrepRate[]> {
    return this.surfaceProtectionRepository.findSurfacePrepRatesBySubstrate(substrate);
  }

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
