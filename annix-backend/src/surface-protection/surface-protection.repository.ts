import { CrudRepository } from "../lib/persistence/crud-repository";
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

export abstract class SurfaceProtectionRepository extends CrudRepository<CoatingSystem> {
  abstract findAllActiveCoatingSystems(): Promise<CoatingSystem[]>;
  abstract findCoatingSystemByCode(systemCode: string): Promise<CoatingSystem | null>;
  abstract findCoatingSystemsByStandard(standard: SystemStandard): Promise<CoatingSystem[]>;
  abstract findCoatingSystemsByApplication(
    application: SystemApplication,
  ): Promise<CoatingSystem[]>;
  abstract findRecommendedCoatingSystems(): Promise<CoatingSystem[]>;

  abstract findRfqSurfaceProtection(rfqId: number): Promise<RfqSurfaceProtection | null>;
  abstract createRfqSurfaceProtection(
    data: Partial<RfqSurfaceProtection>,
  ): Promise<RfqSurfaceProtection>;
  abstract saveRfqSurfaceProtection(entity: RfqSurfaceProtection): Promise<RfqSurfaceProtection>;
  abstract deleteRfqSurfaceProtection(rfqId: number): Promise<void>;

  abstract findAllActiveCoatingRates(): Promise<SpCoatingRate[]>;
  abstract findCoatingRateByCode(rateCode: string): Promise<SpCoatingRate | null>;
  abstract findCoatingRatesByCategory(category: CoatingCategory): Promise<SpCoatingRate[]>;
  abstract findCoatingRatesByISO(
    iso12944Category: ISO12944Category,
    durabilityClass?: DurabilityClass,
  ): Promise<SpCoatingRate[]>;
  abstract findCoatingRatesBySupplier(supplierId: number): Promise<SpCoatingRate[]>;

  abstract findAllActiveLiningRates(): Promise<SpLiningRate[]>;
  abstract findLiningRateByCode(rateCode: string): Promise<SpLiningRate | null>;
  abstract findLiningRatesByType(liningType: LiningType): Promise<SpLiningRate[]>;
  abstract findLiningRatesByCategory(category: LiningCategory): Promise<SpLiningRate[]>;
  abstract findLiningRateByThickness(
    category: LiningCategory,
    thicknessMm: number,
  ): Promise<SpLiningRate | null>;
  abstract findLiningRatesBySupplier(supplierId: number): Promise<SpLiningRate[]>;

  abstract findAllActiveSurfacePrepRates(): Promise<SpSurfacePrepRate[]>;
  abstract findSurfacePrepRateByCode(rateCode: string): Promise<SpSurfacePrepRate | null>;
  abstract findSurfacePrepRatesByGrade(grade: SurfacePrepGrade): Promise<SpSurfacePrepRate[]>;
  abstract findSurfacePrepRatesBySubstrate(
    substrate: SubstrateMaterial,
  ): Promise<SpSurfacePrepRate[]>;
}
