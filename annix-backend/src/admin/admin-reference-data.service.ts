import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { Brackets, DataSource } from "typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
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

  constructor(
    @Optional() private readonly dataSource: DataSource,
    @Optional() @InjectConnection() private readonly connection: Connection,
  ) {}

  private isAllowed(entityName: string): boolean {
    return ALLOWED_ENTITIES.has(entityName);
  }

  private mongoModel(entityName: string): Model<Record<string, unknown>> {
    if (!this.isAllowed(entityName)) {
      throw new NotFoundException(`Entity "${entityName}" not found or not accessible`);
    }
    const model = this.connection?.models[entityName];
    if (!model) {
      throw new NotFoundException(`Entity "${entityName}" not found or not accessible`);
    }
    return model as Model<Record<string, unknown>>;
  }

  private schemaPaths(
    model: Model<Record<string, unknown>>,
  ): Array<{ path: string; instance: string; isRequired?: boolean }> {
    return Object.values(model.schema.paths) as Array<{
      path: string;
      instance: string;
      isRequired?: boolean;
    }>;
  }

  private mongoStringPaths(model: Model<Record<string, unknown>>): string[] {
    return this.schemaPaths(model)
      .filter((p) => p.instance === "String")
      .map((p) => p.path);
  }

  private fromMongoDoc(doc: Record<string, unknown> | null): Record<string, any> | null {
    if (!doc) {
      return null;
    }
    const { _id, __v, ...rest } = doc as Record<string, unknown> & { _id: unknown; __v?: unknown };
    return { id: _id, ...rest };
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
    if (isMongoDriver()) {
      const names = [...ALLOWED_ENTITIES].filter((name) => this.connection?.models[name]);
      const modules = await Promise.all(
        names.map(async (name) => {
          const model = this.mongoModel(name);
          const collectionName = model.collection.collectionName;
          const recordCount = await model.estimatedDocumentCount().exec();
          return {
            entityName: name,
            tableName: collectionName,
            displayName: this.displayNameFromEntity(name),
            category: this.categoryForTable(collectionName),
            columnCount: Object.keys(model.schema.paths).length,
            recordCount,
          };
        }),
      );
      return modules.sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName),
      );
    }

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
    if (isMongoDriver()) {
      const model = this.mongoModel(entityName);
      const columns: ColumnSchema[] = this.schemaPaths(model).map((p) => {
        const isPrimary = p.path === "_id";
        return {
          propertyName: isPrimary ? "id" : p.path,
          databaseName: p.path,
          type: String(p.instance ?? "Mixed").toLowerCase(),
          nullable: isPrimary ? false : !p.isRequired,
          isPrimary,
          isGenerated: isPrimary,
        };
      });
      return { columns, relations: [] };
    }

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
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    if (isMongoDriver()) {
      const model = this.mongoModel(entityName);
      const sortBy = query.sortBy && query.sortBy !== "id" ? query.sortBy : "_id";
      const sortDir = (query.sortOrder ?? "ASC") === "DESC" ? -1 : 1;

      const filter: Record<string, unknown> = {};
      if (query.search) {
        const stringPaths = this.mongoStringPaths(model);
        if (stringPaths.length > 0) {
          const pattern = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          filter.$or = stringPaths.map((path) => ({
            [path]: { $regex: pattern, $options: "i" },
          }));
        }
      }

      const [docs, total] = await Promise.all([
        model
          .find(filter)
          .sort({ [sortBy]: sortDir })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        model.countDocuments(filter).exec(),
      ]);

      const items = docs.map((doc) => {
        const { _id, __v, ...rest } = doc as Record<string, unknown> & {
          _id: unknown;
          __v?: unknown;
        };
        return { id: _id, ...rest };
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

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
    if (isMongoDriver()) {
      const model = this.mongoModel(entityName);
      const doc = await model.findById(id).lean().exec();
      const mapped = this.fromMongoDoc(doc as Record<string, unknown> | null);
      if (!mapped) {
        throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
      }
      return mapped;
    }

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

  private validateAndCoerce(entityName: string, data: Record<string, any>): Record<string, any> {
    const metadata = this.entityMetadata(entityName);
    const NUMERIC_TYPES = new Set([
      "number",
      "int",
      "integer",
      "float",
      "decimal",
      "double",
      "bigint",
      "smallint",
    ]);
    const DATE_TYPES = new Set(["date"]);
    const TIMESTAMP_TYPES = new Set([
      "timestamp",
      "timestamptz",
      "timestamp with time zone",
      "timestamp without time zone",
      "datetime",
    ]);
    const BOOLEAN_TYPES = new Set(["boolean", "bool"]);

    const errors: string[] = [];
    const coerced: Record<string, any> = {};

    Object.entries(data).forEach(([key, value]) => {
      const col = metadata.columns.find((c) => c.propertyName === key);
      if (!col) {
        coerced[key] = value;
        return;
      }

      if (value === null || value === undefined) {
        if (!col.isNullable && !col.isGenerated) {
          errors.push(`${key} is required`);
        }
        coerced[key] = null;
        return;
      }

      const colType =
        typeof col.type === "function" ? col.type.name.toLowerCase() : String(col.type);

      if (NUMERIC_TYPES.has(colType)) {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors.push(`${key} must be a valid number`);
        } else {
          coerced[key] = num;
        }
      } else if (DATE_TYPES.has(colType) || TIMESTAMP_TYPES.has(colType)) {
        const dateStr = String(value);
        const parsed = new Date(dateStr);
        if (Number.isNaN(parsed.getTime())) {
          errors.push(`${key} must be a valid date`);
        } else {
          coerced[key] = DATE_TYPES.has(colType) ? dateStr.substring(0, 10) : parsed;
        }
      } else if (BOOLEAN_TYPES.has(colType)) {
        coerced[key] = Boolean(value);
      } else {
        coerced[key] = value;
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors.join("; "));
    }

    return coerced;
  }

  async createRecord(entityName: string, data: Record<string, any>): Promise<Record<string, any>> {
    if (isMongoDriver()) {
      const model = this.mongoModel(entityName);
      const { id: _ignoredId, ...rest } = data;
      const highest = (await model.findOne().sort({ _id: -1 }).lean().exec()) as {
        _id?: number;
      } | null;
      const nextId = highest?._id ? Number(highest._id) + 1 : 1;
      const created = await model.create({ _id: nextId, ...rest });
      return this.fromMongoDoc(created.toObject()) as Record<string, any>;
    }

    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

    const validated = this.validateAndCoerce(entityName, data);
    const entity = repo.create(validated as any);
    return repo.save(entity);
  }

  async updateRecord(
    entityName: string,
    id: number,
    data: Record<string, any>,
  ): Promise<Record<string, any>> {
    if (isMongoDriver()) {
      const model = this.mongoModel(entityName);
      const { id: _ignoredId, ...rest } = data;
      const updated = await model
        .findByIdAndUpdate(id, { $set: rest }, { new: true })
        .lean()
        .exec();
      const mapped = this.fromMongoDoc(updated as Record<string, unknown> | null);
      if (!mapped) {
        throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
      }
      return mapped;
    }

    const metadata = this.entityMetadata(entityName);
    const repo = this.dataSource.getRepository(metadata.target);

    const existing = await repo.findOne({ where: { id } as any });
    if (!existing) {
      throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
    }

    const validated = this.validateAndCoerce(entityName, data);
    const merged = repo.merge(existing as any, validated as any);
    return repo.save(merged);
  }

  async deleteRecord(
    entityName: string,
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    if (isMongoDriver()) {
      const model = this.mongoModel(entityName);
      const result = await model.deleteOne({ _id: id }).exec();
      if (!result.deletedCount) {
        throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
      }
      return { success: true, message: `Record ${id} deleted from ${entityName}` };
    }

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
