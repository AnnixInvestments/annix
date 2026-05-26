import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FabricationComplexity } from "./entities/fabrication-complexity.entity";
import { FabricationOperation } from "./entities/fabrication-operation.entity";
import { ShopLaborRate } from "./entities/shop-labor-rate.entity";
import { StructuralSteelGrade } from "./entities/structural-steel-grade.entity";
import { StructuralSteelSection } from "./entities/structural-steel-section.entity";
import { StructuralSteelType } from "./entities/structural-steel-type.entity";
import { StructuralSteelRepository } from "./structural-steel.repository";

@Injectable()
export class PostgresStructuralSteelRepository
  extends TypeOrmCrudRepository<StructuralSteelType>
  implements StructuralSteelRepository
{
  constructor(
    @InjectRepository(StructuralSteelType) repository: Repository<StructuralSteelType>,
    @InjectRepository(StructuralSteelSection)
    private readonly sectionRepository: Repository<StructuralSteelSection>,
    @InjectRepository(StructuralSteelGrade)
    private readonly gradeRepository: Repository<StructuralSteelGrade>,
    @InjectRepository(FabricationOperation)
    private readonly operationRepository: Repository<FabricationOperation>,
    @InjectRepository(FabricationComplexity)
    private readonly complexityRepository: Repository<FabricationComplexity>,
    @InjectRepository(ShopLaborRate)
    private readonly laborRateRepository: Repository<ShopLaborRate>,
  ) {
    super(repository);
  }

  findAllActiveTypes(): Promise<StructuralSteelType[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findTypeByCode(code: string): Promise<StructuralSteelType | null> {
    return this.repository.findOne({ where: { code, isActive: true } });
  }

  findTypeWithSections(typeId: number): Promise<StructuralSteelType | null> {
    return this.repository.findOne({
      where: { id: typeId, isActive: true },
      relations: ["sections"],
    });
  }

  findAllActiveSections(): Promise<StructuralSteelSection[]> {
    return this.sectionRepository.find({
      where: { isActive: true },
      relations: ["steelType"],
      order: { typeId: "ASC", displayOrder: "ASC" },
    });
  }

  findSectionsByTypeId(typeId: number): Promise<StructuralSteelSection[]> {
    return this.sectionRepository.find({
      where: { typeId, isActive: true },
      order: { displayOrder: "ASC", designation: "ASC" },
    });
  }

  findSectionById(id: number): Promise<StructuralSteelSection | null> {
    return this.sectionRepository.findOne({
      where: { id, isActive: true },
      relations: ["steelType"],
    });
  }

  searchSections(query: string): Promise<StructuralSteelSection[]> {
    return this.sectionRepository
      .createQueryBuilder("section")
      .leftJoinAndSelect("section.steelType", "type")
      .where("section.is_active = :active", { active: true })
      .andWhere("(section.designation ILIKE :query OR type.name ILIKE :query)", {
        query: `%${query}%`,
      })
      .orderBy("type.display_order", "ASC")
      .addOrderBy("section.display_order", "ASC")
      .getMany();
  }

  findAllActiveGrades(): Promise<StructuralSteelGrade[]> {
    return this.gradeRepository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC", code: "ASC" },
    });
  }

  findGradesByTypeCode(typeCode: string): Promise<StructuralSteelGrade[]> {
    return this.gradeRepository
      .createQueryBuilder("grade")
      .where("grade.is_active = :active", { active: true })
      .andWhere(":typeCode = ANY(grade.compatible_types)", { typeCode })
      .orderBy("grade.display_order", "ASC")
      .getMany();
  }

  findGradeByCode(code: string): Promise<StructuralSteelGrade | null> {
    return this.gradeRepository.findOne({ where: { code, isActive: true } });
  }

  findAllActiveOperations(): Promise<FabricationOperation[]> {
    return this.operationRepository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findOperationByCode(code: string): Promise<FabricationOperation | null> {
    return this.operationRepository.findOne({
      where: { code, isActive: true },
    });
  }

  findAllActiveComplexityLevels(): Promise<FabricationComplexity[]> {
    return this.complexityRepository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC" },
    });
  }

  findComplexityByLevel(level: string): Promise<FabricationComplexity | null> {
    return this.complexityRepository.findOne({
      where: { level, isActive: true },
    });
  }

  findAllActiveLaborRates(): Promise<ShopLaborRate[]> {
    return this.laborRateRepository.find({
      where: { isActive: true },
      order: { code: "ASC" },
    });
  }

  findLaborRateByCode(code: string): Promise<ShopLaborRate | null> {
    return this.laborRateRepository.findOne({
      where: { code, isActive: true },
    });
  }

  findLaborRateByCodeUnfiltered(code: string): Promise<ShopLaborRate | null> {
    return this.laborRateRepository.findOne({ where: { code } });
  }

  saveLaborRate(entity: ShopLaborRate): Promise<ShopLaborRate> {
    return this.laborRateRepository.save(entity);
  }
}
