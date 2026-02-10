import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Brackets, DataSource } from "typeorm";
import {
  ColumnSchema,
  EntitySchemaResponse,
  PaginatedReferenceDataResponse,
  ReferenceDataModuleInfo,
  ReferenceDataQueryDto,
  RelationSchema,
} from "./dto/admin-reference-data.dto";

const ALLOWED_ENTITIES: ReadonlySet<string> = new Set([
  "PipeSchedule",
  "PipeDimension",
  "PipeEndConfiguration",
  "PipePressure",
  "NominalOutsideDiameterMm",
  "NbOdLookup",
  "NbNpsLookup",
  "FlangeType",
  "FlangeStandard",
  "FlangeDimension",
  "FlangePressureClass",
  "FlangePtRating",
  "FlangeTypeWeight",
  "FlangeBolting",
  "FlangeBoltingMaterial",
  "FittingType",
  "FittingDimension",
  "FittingBore",
  "Sabs62FittingDimension",
  "Sabs719FittingDimension",
  "Sabs719BendDimension",
  "DuckfootElbowDimension",
  "BendCenterToFace",
  "BendSegmentRule",
  "SweepTeeDimension",
  "SteelSpecification",
  "StainlessSteelGrade",
  "AnsiB169FittingType",
  "AnsiB169FittingDimension",
  "ForgedFittingType",
  "ForgedFittingSeries",
  "ForgedFittingDimension",
  "ForgedFittingPtRating",
  "WeldType",
  "WeldThicknessPipeRecommendation",
  "WeldThicknessFittingRecommendation",
  "Bolt",
  "PipeClamp",
  "UBolt",
  "BoltMass",
  "NutMass",
  "Washer",
  "GasketWeight",
  "RetainingRingWeight",
  "SpectacleBlind",
  "BnwSetWeight",
  "CoatingSpecification",
  "CoatingStandard",
  "CoatingEnvironment",
  "FlowCoefficient",
  "AbrasionResistance",
  "AngleRange",
  "MaterialLimit",
  "Sabs719TestPressure",
  "HdpeStandard",
  "HdpePipeSpecification",
  "HdpeFittingType",
  "HdpeFittingWeight",
  "HdpeButtweldPrice",
  "HdpeStubPrice",
  "HdpeChemicalResistance",
  "PvcStandard",
  "PvcPipeSpecification",
  "PvcFittingType",
  "PvcFittingWeight",
  "PvcCementPrice",
  "StructuralSteelType",
  "StructuralSteelGrade",
  "StructuralSteelSection",
  "FabricationOperation",
  "FabricationComplexity",
  "ShopLaborRate",
  "RubberSpecification",
  "RubberType",
  "RubberCompany",
  "RubberApplication",
  "RubberChemicalCompatibility",
  "RubberProduct",
  "RubberProductCoding",
  "RubberPricingTier",
  "BracketType",
  "BracketDimensionBySize",
  "PipeSupportSpacing",
  "ReinforcementPadStandard",
  "PipeSteelWorkConfig",
]);

const CATEGORY_RULES: ReadonlyArray<[RegExp, string]> = [
  [/^flange/i, "Flanges"],
  [/^pipe/i, "Pipes"],
  [/^fitting/i, "Fittings"],
  [/^sabs/i, "SABS Standards"],
  [/^ansi/i, "ANSI Standards"],
  [/^forged_fitting/i, "Forged Fittings"],
  [/^bolt/i, "Bolts & Fasteners"],
  [/^nut/i, "Bolts & Fasteners"],
  [/^washer/i, "Bolts & Fasteners"],
  [/^weld/i, "Welding"],
  [/^coating/i, "Coatings"],
  [/^hdpe/i, "HDPE"],
  [/^pvc/i, "PVC"],
  [/^structural_steel/i, "Structural Steel"],
  [/^fabrication/i, "Structural Steel"],
  [/^shop_labor/i, "Structural Steel"],
  [/^rubber/i, "Rubber Lining"],
  [/^steel_spec/i, "Materials"],
  [/^stainless/i, "Materials"],
  [/^bend/i, "Bends"],
  [/^duckfoot/i, "Bends"],
  [/^sweep_tee/i, "Fittings"],
  [/^bracket/i, "Pipe Steel Work"],
  [/^pipe_support/i, "Pipe Steel Work"],
  [/^reinforcement/i, "Pipe Steel Work"],
  [/^pipe_steel_work/i, "Pipe Steel Work"],
];

@Injectable()
export class AdminReferenceDataService {
  private readonly logger = new Logger(AdminReferenceDataService.name);

  constructor(private readonly dataSource: DataSource) {}

  private isAllowed(entityName: string): boolean {
    return ALLOWED_ENTITIES.has(entityName);
  }

  private entityMetadata(entityName: string) {
    const metadata = this.dataSource.entityMetadatas.find((m) => m.name === entityName);
    if (!metadata || !this.isAllowed(entityName)) {
      throw new NotFoundException(`Entity "${entityName}" not found or not accessible`);
    }
    return metadata;
  }

  private categoryForTable(tableName: string): string {
    const match = CATEGORY_RULES.find(([pattern]) => pattern.test(tableName));
    if (match) {
      return match[1];
    }
    return "Other";
  }

  private displayNameFromEntity(entityName: string): string {
    return entityName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  }

  async registeredModules(): Promise<ReferenceDataModuleInfo[]> {
    const modules = await Promise.all(
      this.dataSource.entityMetadatas
        .filter((m) => this.isAllowed(m.name))
        .map(async (metadata) => {
          const repo = this.dataSource.getRepository(metadata.target);
          const recordCount = await repo.count();

          return {
            entityName: metadata.name,
            tableName: metadata.tableName,
            displayName: this.displayNameFromEntity(metadata.name),
            category: this.categoryForTable(metadata.tableName),
            columnCount: metadata.columns.length,
            recordCount,
          };
        }),
    );

    return modules.sort(
      (a, b) => a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName),
    );
  }

  entitySchema(entityName: string): EntitySchemaResponse {
    const metadata = this.entityMetadata(entityName);

    const columns: ColumnSchema[] = metadata.columns.map((col) => ({
      propertyName: col.propertyName,
      databaseName: col.databaseName,
      type: typeof col.type === "function" ? col.type.name.toLowerCase() : String(col.type),
      nullable: col.isNullable,
      isPrimary: col.isPrimary,
      isGenerated: col.isGenerated,
    }));

    const relations: RelationSchema[] = metadata.relations
      .filter((rel) => rel.relationType === "many-to-one" || rel.relationType === "one-to-one")
      .map((rel) => ({
        propertyName: rel.propertyName,
        relationType: rel.relationType,
        targetEntityName: rel.inverseEntityMetadata.name,
        joinColumnName: rel.joinColumns?.[0]?.databaseName ?? null,
      }));

    return { columns, relations };
  }

  async records(
    entityName: string,
    query: ReferenceDataQueryDto,
  ): Promise<PaginatedReferenceDataResponse> {
    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const sortBy = query.sortBy ?? "id";
    const sortOrder = query.sortOrder ?? "ASC";

    const sortColumn = metadata.columns.find((c) => c.propertyName === sortBy);
    const effectiveSortBy = sortColumn ? sortColumn.propertyName : "id";

    const qb = repo.createQueryBuilder("entity");

    const manyToOneRelations = metadata.relations.filter(
      (rel) => rel.relationType === "many-to-one",
    );
    manyToOneRelations.forEach((rel) => {
      qb.leftJoinAndSelect(`entity.${rel.propertyName}`, rel.propertyName);
    });

    if (query.search) {
      const stringColumns = metadata.columns.filter((c) => {
        const colType = c.type as any;
        return (
          colType === String ||
          colType === "varchar" ||
          colType === "text" ||
          colType === "character varying"
        );
      });

      if (stringColumns.length > 0) {
        qb.andWhere(
          new Brackets((wb) => {
            stringColumns.forEach((col, index) => {
              const paramName = `search_${index}`;
              if (index === 0) {
                wb.where(`entity.${col.propertyName} ILIKE :${paramName}`, {
                  [paramName]: `%${query.search}%`,
                });
              } else {
                wb.orWhere(`entity.${col.propertyName} ILIKE :${paramName}`, {
                  [paramName]: `%${query.search}%`,
                });
              }
            });
          }),
        );
      }
    }

    qb.orderBy(`entity.${effectiveSortBy}`, sortOrder);
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async record(entityName: string, id: number): Promise<Record<string, any>> {
    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

    const relations = metadata.relations
      .filter((rel) => rel.relationType === "many-to-one")
      .map((rel) => rel.propertyName);

    const entity = await repo.findOne({
      where: { id } as any,
      relations,
    });

    if (!entity) {
      throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
    }

    return entity;
  }

  async createRecord(entityName: string, data: Record<string, any>): Promise<Record<string, any>> {
    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

    const entity = repo.create(data as any);
    return repo.save(entity);
  }

  async updateRecord(
    entityName: string,
    id: number,
    data: Record<string, any>,
  ): Promise<Record<string, any>> {
    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

    const existing = await repo.findOne({ where: { id } as any });
    if (!existing) {
      throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
    }

    const merged = repo.merge(existing as any, data as any);
    return repo.save(merged);
  }

  async deleteRecord(
    entityName: string,
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

    const existing = await repo.findOne({ where: { id } as any });
    if (!existing) {
      throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
    }

    try {
      await repo.remove(existing as any);
      return { success: true, message: `Record ${id} deleted from ${entityName}` };
    } catch (error: any) {
      if (error.code === "23503") {
        const detail = error.detail || "";
        return {
          success: false,
          message: `Cannot delete: this record is referenced by other data. ${detail}`,
        };
      }
      throw error;
    }
  }
}
