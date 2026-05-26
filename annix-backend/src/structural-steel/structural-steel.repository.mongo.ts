import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FabricationComplexity } from "./entities/fabrication-complexity.entity";
import { FabricationOperation } from "./entities/fabrication-operation.entity";
import { ShopLaborRate } from "./entities/shop-labor-rate.entity";
import { StructuralSteelGrade } from "./entities/structural-steel-grade.entity";
import { StructuralSteelSection } from "./entities/structural-steel-section.entity";
import { StructuralSteelType } from "./entities/structural-steel-type.entity";
import { StructuralSteelRepository } from "./structural-steel.repository";

@Injectable()
export class MongoStructuralSteelRepository
  extends MongoCrudRepository<StructuralSteelType>
  implements StructuralSteelRepository
{
  constructor(@InjectModel("StructuralSteelType") model: Model<StructuralSteelType>) {
    super(model);
  }

  private get sectionModel(): Model<StructuralSteelSection> {
    return this.model.db.model<StructuralSteelSection>("StructuralSteelSection");
  }

  private get gradeModel(): Model<StructuralSteelGrade> {
    return this.model.db.model<StructuralSteelGrade>("StructuralSteelGrade");
  }

  private get operationModel(): Model<FabricationOperation> {
    return this.model.db.model<FabricationOperation>("FabricationOperation");
  }

  private get complexityModel(): Model<FabricationComplexity> {
    return this.model.db.model<FabricationComplexity>("FabricationComplexity");
  }

  private get laborRateModel(): Model<ShopLaborRate> {
    return this.model.db.model<ShopLaborRate>("ShopLaborRate");
  }

  private get sections() {
    return this.sectionModel as unknown as Model<Record<string, unknown>>;
  }

  private get grades() {
    return this.gradeModel as unknown as Model<Record<string, unknown>>;
  }

  private get operations() {
    return this.operationModel as unknown as Model<Record<string, unknown>>;
  }

  private get complexities() {
    return this.complexityModel as unknown as Model<Record<string, unknown>>;
  }

  private get laborRates() {
    return this.laborRateModel as unknown as Model<Record<string, unknown>>;
  }

  async findAllActiveTypes(): Promise<StructuralSteelType[]> {
    const docs = await this.documents
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findTypeByCode(code: string): Promise<StructuralSteelType | null> {
    const doc = await this.documents.findOne({ code, isActive: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findTypeWithSections(typeId: number): Promise<StructuralSteelType | null> {
    const doc = await this.documents.findOne({ _id: typeId, isActive: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllActiveSections(): Promise<StructuralSteelSection[]> {
    const docs = await this.sections
      .find({ isActive: true })
      .sort({ typeId: 1, displayOrder: 1 })
      .lean()
      .exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as StructuralSteelSection;
    });
  }

  async findSectionsByTypeId(typeId: number): Promise<StructuralSteelSection[]> {
    const docs = await this.sections
      .find({ typeId, isActive: true })
      .sort({ displayOrder: 1, designation: 1 })
      .lean()
      .exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as StructuralSteelSection;
    });
  }

  async findSectionById(id: number): Promise<StructuralSteelSection | null> {
    const doc = await this.sections.findOne({ _id: id, isActive: true }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as StructuralSteelSection;
  }

  async searchSections(query: string): Promise<StructuralSteelSection[]> {
    const docs = await this.sections
      .find({
        isActive: true,
        designation: { $regex: query, $options: "i" },
      })
      .sort({ displayOrder: 1 })
      .lean()
      .exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as StructuralSteelSection;
    });
  }

  async findAllActiveGrades(): Promise<StructuralSteelGrade[]> {
    const docs = await this.grades
      .find({ isActive: true })
      .sort({ displayOrder: 1, code: 1 })
      .lean()
      .exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as StructuralSteelGrade;
    });
  }

  async findGradesByTypeCode(typeCode: string): Promise<StructuralSteelGrade[]> {
    const docs = await this.grades
      .find({ isActive: true, compatibleTypes: typeCode })
      .sort({ displayOrder: 1 })
      .lean()
      .exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as StructuralSteelGrade;
    });
  }

  async findGradeByCode(code: string): Promise<StructuralSteelGrade | null> {
    const doc = await this.grades.findOne({ code, isActive: true }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as StructuralSteelGrade;
  }

  async findAllActiveOperations(): Promise<FabricationOperation[]> {
    const docs = await this.operations
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as FabricationOperation;
    });
  }

  async findOperationByCode(code: string): Promise<FabricationOperation | null> {
    const doc = await this.operations.findOne({ code, isActive: true }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as FabricationOperation;
  }

  async findAllActiveComplexityLevels(): Promise<FabricationComplexity[]> {
    const docs = await this.complexities
      .find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean()
      .exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as FabricationComplexity;
    });
  }

  async findComplexityByLevel(level: string): Promise<FabricationComplexity | null> {
    const doc = await this.complexities.findOne({ level, isActive: true }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as FabricationComplexity;
  }

  async findAllActiveLaborRates(): Promise<ShopLaborRate[]> {
    const docs = await this.laborRates.find({ isActive: true }).sort({ code: 1 }).lean().exec();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest } as unknown as ShopLaborRate;
    });
  }

  async findLaborRateByCode(code: string): Promise<ShopLaborRate | null> {
    const doc = await this.laborRates.findOne({ code, isActive: true }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as ShopLaborRate;
  }

  async findLaborRateByCodeUnfiltered(code: string): Promise<ShopLaborRate | null> {
    const doc = await this.laborRates.findOne({ code }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as ShopLaborRate;
  }

  async saveLaborRate(entity: ShopLaborRate): Promise<ShopLaborRate> {
    const saved = await this.laborRates
      .findByIdAndUpdate(
        entity.id,
        { $set: { ...entity, _id: entity.id } },
        { new: true, upsert: true },
      )
      .lean()
      .exec();
    const { _id, ...rest } = saved as Record<string, unknown>;
    return { id: _id, ...rest } as unknown as ShopLaborRate;
  }
}
