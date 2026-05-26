import { CrudRepository } from "../lib/persistence/crud-repository";
import { FabricationComplexity } from "./entities/fabrication-complexity.entity";
import { FabricationOperation } from "./entities/fabrication-operation.entity";
import { ShopLaborRate } from "./entities/shop-labor-rate.entity";
import { StructuralSteelGrade } from "./entities/structural-steel-grade.entity";
import { StructuralSteelSection } from "./entities/structural-steel-section.entity";
import { StructuralSteelType } from "./entities/structural-steel-type.entity";

export abstract class StructuralSteelRepository extends CrudRepository<StructuralSteelType> {
  abstract findAllActiveTypes(): Promise<StructuralSteelType[]>;
  abstract findTypeByCode(code: string): Promise<StructuralSteelType | null>;
  abstract findTypeWithSections(typeId: number): Promise<StructuralSteelType | null>;

  abstract findAllActiveSections(): Promise<StructuralSteelSection[]>;
  abstract findSectionsByTypeId(typeId: number): Promise<StructuralSteelSection[]>;
  abstract findSectionById(id: number): Promise<StructuralSteelSection | null>;
  abstract searchSections(query: string): Promise<StructuralSteelSection[]>;

  abstract findAllActiveGrades(): Promise<StructuralSteelGrade[]>;
  abstract findGradesByTypeCode(typeCode: string): Promise<StructuralSteelGrade[]>;
  abstract findGradeByCode(code: string): Promise<StructuralSteelGrade | null>;

  abstract findAllActiveOperations(): Promise<FabricationOperation[]>;
  abstract findOperationByCode(code: string): Promise<FabricationOperation | null>;

  abstract findAllActiveComplexityLevels(): Promise<FabricationComplexity[]>;
  abstract findComplexityByLevel(level: string): Promise<FabricationComplexity | null>;

  abstract findAllActiveLaborRates(): Promise<ShopLaborRate[]>;
  abstract findLaborRateByCode(code: string): Promise<ShopLaborRate | null>;
  abstract findLaborRateByCodeUnfiltered(code: string): Promise<ShopLaborRate | null>;
  abstract saveLaborRate(entity: ShopLaborRate): Promise<ShopLaborRate>;
}
