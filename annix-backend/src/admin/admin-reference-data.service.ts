import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import {
  ColumnSchema,
  EntitySchemaResponse,
  PaginatedReferenceDataResponse,
  ReferenceDataModuleInfo,
  ReferenceDataQueryDto,
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
  constructor(@InjectConnection() private readonly connection: Connection) {}

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
      (a, b) => a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName),
    );
  }

  entitySchema(entityName: string): EntitySchemaResponse {
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

  async records(
    entityName: string,
    query: ReferenceDataQueryDto,
  ): Promise<PaginatedReferenceDataResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

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

  async record(entityName: string, id: number): Promise<Record<string, any>> {
    const model = this.mongoModel(entityName);
    const doc = await model.findById(id).lean().exec();
    const mapped = this.fromMongoDoc(doc as Record<string, unknown> | null);
    if (!mapped) {
      throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
    }
    return mapped;
  }

  async createRecord(entityName: string, data: Record<string, any>): Promise<Record<string, any>> {
    const model = this.mongoModel(entityName);
    const { id: _ignoredId, ...rest } = data;
    const highest = (await model.findOne().sort({ _id: -1 }).lean().exec()) as {
      _id?: number;
    } | null;
    const nextId = highest?._id ? Number(highest._id) + 1 : 1;
    const created = await model.create({ _id: nextId, ...rest });
    return this.fromMongoDoc(created.toObject()) as Record<string, any>;
  }

  async updateRecord(
    entityName: string,
    id: number,
    data: Record<string, any>,
  ): Promise<Record<string, any>> {
    const model = this.mongoModel(entityName);
    const { id: _ignoredId, ...rest } = data;
    const updated = await model.findByIdAndUpdate(id, { $set: rest }, { new: true }).lean().exec();
    const mapped = this.fromMongoDoc(updated as Record<string, unknown> | null);
    if (!mapped) {
      throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
    }
    return mapped;
  }

  async deleteRecord(
    entityName: string,
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    const model = this.mongoModel(entityName);
    const result = await model.deleteOne({ _id: id }).exec();
    if (!result.deletedCount) {
      throw new NotFoundException(`Record with id ${id} not found in ${entityName}`);
    }
    return { success: true, message: `Record ${id} deleted from ${entityName}` };
  }
}
