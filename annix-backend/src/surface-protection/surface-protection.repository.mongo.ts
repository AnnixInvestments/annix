import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
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
export class MongoSurfaceProtectionRepository
  extends MongoCrudRepository<CoatingSystem>
  implements SurfaceProtectionRepository
{
  constructor(@InjectModel("CoatingSystem") model: Model<CoatingSystem>) {
    super(model);
  }

  private get rfqSpModel(): Model<RfqSurfaceProtection> {
    return this.model.db.model<RfqSurfaceProtection>("RfqSurfaceProtection");
  }

  private get coatingRateModel(): Model<SpCoatingRate> {
    return this.model.db.model<SpCoatingRate>("SpCoatingRate");
  }

  private get liningRateModel(): Model<SpLiningRate> {
    return this.model.db.model<SpLiningRate>("SpLiningRate");
  }

  private get surfacePrepRateModel(): Model<SpSurfacePrepRate> {
    return this.model.db.model<SpSurfacePrepRate>("SpSurfacePrepRate");
  }

  private get rfqSp() {
    return this.rfqSpModel as unknown as Model<Record<string, unknown>>;
  }

  private get coatingRates() {
    return this.coatingRateModel as unknown as Model<Record<string, unknown>>;
  }

  private get liningRates() {
    return this.liningRateModel as unknown as Model<Record<string, unknown>>;
  }

  private get surfacePrepRates() {
    return this.surfacePrepRateModel as unknown as Model<Record<string, unknown>>;
  }

  private toCoatingSystem(doc: Record<string, unknown> | null): CoatingSystem | null {
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as CoatingSystem;
  }

  private toCoatingSystemList(docs: Record<string, unknown>[]): CoatingSystem[] {
    return docs.map((d) => this.toCoatingSystem(d) as CoatingSystem);
  }

  private toRfqSp(doc: Record<string, unknown> | null): RfqSurfaceProtection | null {
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as RfqSurfaceProtection;
  }

  private toCoatingRate(doc: Record<string, unknown> | null): SpCoatingRate | null {
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as SpCoatingRate;
  }

  private toCoatingRateList(docs: Record<string, unknown>[]): SpCoatingRate[] {
    return docs.map((d) => this.toCoatingRate(d) as SpCoatingRate);
  }

  private toLiningRate(doc: Record<string, unknown> | null): SpLiningRate | null {
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as SpLiningRate;
  }

  private toLiningRateList(docs: Record<string, unknown>[]): SpLiningRate[] {
    return docs.map((d) => this.toLiningRate(d) as SpLiningRate);
  }

  private toPrepRate(doc: Record<string, unknown> | null): SpSurfacePrepRate | null {
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as SpSurfacePrepRate;
  }

  private toPrepRateList(docs: Record<string, unknown>[]): SpSurfacePrepRate[] {
    return docs.map((d) => this.toPrepRate(d) as SpSurfacePrepRate);
  }

  async findAllActiveCoatingSystems(): Promise<CoatingSystem[]> {
    const docs = await this.documents
      .find({ isActive: true })
      .sort({ systemCode: 1 })
      .lean()
      .exec();
    return this.toCoatingSystemList(docs);
  }

  async findCoatingSystemByCode(systemCode: string): Promise<CoatingSystem | null> {
    const doc = await this.documents.findOne({ systemCode, isActive: true }).lean().exec();
    return this.toCoatingSystem(doc);
  }

  async findCoatingSystemsByStandard(standard: SystemStandard): Promise<CoatingSystem[]> {
    const docs = await this.documents
      .find({ systemStandard: standard, isActive: true })
      .sort({ systemCode: 1 })
      .lean()
      .exec();
    return this.toCoatingSystemList(docs);
  }

  async findCoatingSystemsByApplication(application: SystemApplication): Promise<CoatingSystem[]> {
    const docs = await this.documents
      .find({ application, isActive: true })
      .sort({ systemCode: 1 })
      .lean()
      .exec();
    return this.toCoatingSystemList(docs);
  }

  async findRecommendedCoatingSystems(): Promise<CoatingSystem[]> {
    const docs = await this.documents.find({ isActive: true, isRecommended: true }).lean().exec();
    return this.toCoatingSystemList(docs);
  }

  async findRfqSurfaceProtection(rfqId: number): Promise<RfqSurfaceProtection | null> {
    const doc = await this.rfqSp.findOne({ rfqId }).lean().exec();
    return this.toRfqSp(doc);
  }

  async createRfqSurfaceProtection(
    data: Partial<RfqSurfaceProtection>,
  ): Promise<RfqSurfaceProtection> {
    const ModelClass = this.rfqSp;
    const document = new ModelClass(data);
    await document.save();
    const obj = document.toObject() as Record<string, unknown>;
    const { _id, ...rest } = obj;
    return { id: _id, ...rest } as unknown as RfqSurfaceProtection;
  }

  async saveRfqSurfaceProtection(entity: RfqSurfaceProtection): Promise<RfqSurfaceProtection> {
    const saved = await this.rfqSp
      .findByIdAndUpdate(entity.id, { $set: entity }, { new: true, upsert: true })
      .lean()
      .exec();
    return this.toRfqSp(saved) as RfqSurfaceProtection;
  }

  async deleteRfqSurfaceProtection(rfqId: number): Promise<void> {
    await this.rfqSp.deleteOne({ rfqId }).exec();
  }

  async findAllActiveCoatingRates(): Promise<SpCoatingRate[]> {
    const docs = await this.coatingRates
      .find({ isActive: true })
      .sort({ rateCode: 1 })
      .lean()
      .exec();
    return this.toCoatingRateList(docs);
  }

  async findCoatingRateByCode(rateCode: string): Promise<SpCoatingRate | null> {
    const doc = await this.coatingRates.findOne({ rateCode, isActive: true }).lean().exec();
    return this.toCoatingRate(doc);
  }

  async findCoatingRatesByCategory(category: CoatingCategory): Promise<SpCoatingRate[]> {
    const docs = await this.coatingRates
      .find({ coatingCategory: category, isActive: true })
      .sort({ totalPricePerM2: 1 })
      .lean()
      .exec();
    return this.toCoatingRateList(docs);
  }

  async findCoatingRatesByISO(
    iso12944Category: ISO12944Category,
    durabilityClass?: DurabilityClass,
  ): Promise<SpCoatingRate[]> {
    const filter: Record<string, unknown> = { iso12944Category, isActive: true };
    if (durabilityClass) {
      filter.durabilityClass = durabilityClass;
    }
    const docs = await this.coatingRates.find(filter).sort({ totalPricePerM2: 1 }).lean().exec();
    return this.toCoatingRateList(docs);
  }

  async findCoatingRatesBySupplier(supplierId: number): Promise<SpCoatingRate[]> {
    const docs = await this.coatingRates
      .find({ supplierId, isActive: true })
      .sort({ rateCode: 1 })
      .lean()
      .exec();
    return this.toCoatingRateList(docs);
  }

  async findAllActiveLiningRates(): Promise<SpLiningRate[]> {
    const docs = await this.liningRates
      .find({ isActive: true })
      .sort({ rateCode: 1 })
      .lean()
      .exec();
    return this.toLiningRateList(docs);
  }

  async findLiningRateByCode(rateCode: string): Promise<SpLiningRate | null> {
    const doc = await this.liningRates.findOne({ rateCode, isActive: true }).lean().exec();
    return this.toLiningRate(doc);
  }

  async findLiningRatesByType(liningType: LiningType): Promise<SpLiningRate[]> {
    const docs = await this.liningRates
      .find({ liningType, isActive: true })
      .sort({ totalPricePerM2: 1 })
      .lean()
      .exec();
    return this.toLiningRateList(docs);
  }

  async findLiningRatesByCategory(category: LiningCategory): Promise<SpLiningRate[]> {
    const docs = await this.liningRates
      .find({ liningCategory: category, isActive: true })
      .sort({ thicknessMm: 1 })
      .lean()
      .exec();
    return this.toLiningRateList(docs);
  }

  async findLiningRateByThickness(
    category: LiningCategory,
    thicknessMm: number,
  ): Promise<SpLiningRate | null> {
    const doc = await this.liningRates
      .findOne({ liningCategory: category, thicknessMm, isActive: true })
      .lean()
      .exec();
    return this.toLiningRate(doc);
  }

  async findLiningRatesBySupplier(supplierId: number): Promise<SpLiningRate[]> {
    const docs = await this.liningRates
      .find({ supplierId, isActive: true })
      .sort({ rateCode: 1 })
      .lean()
      .exec();
    return this.toLiningRateList(docs);
  }

  async findAllActiveSurfacePrepRates(): Promise<SpSurfacePrepRate[]> {
    const docs = await this.surfacePrepRates
      .find({ isActive: true })
      .sort({ rateCode: 1 })
      .lean()
      .exec();
    return this.toPrepRateList(docs);
  }

  async findSurfacePrepRateByCode(rateCode: string): Promise<SpSurfacePrepRate | null> {
    const doc = await this.surfacePrepRates.findOne({ rateCode, isActive: true }).lean().exec();
    return this.toPrepRate(doc);
  }

  async findSurfacePrepRatesByGrade(grade: SurfacePrepGrade): Promise<SpSurfacePrepRate[]> {
    const docs = await this.surfacePrepRates
      .find({ prepGrade: grade, isActive: true })
      .sort({ pricePerM2: 1 })
      .lean()
      .exec();
    return this.toPrepRateList(docs);
  }

  async findSurfacePrepRatesBySubstrate(
    substrate: SubstrateMaterial,
  ): Promise<SpSurfacePrepRate[]> {
    const docs = await this.surfacePrepRates
      .find({ substrateMaterial: substrate, isActive: true })
      .sort({ pricePerM2: 1 })
      .lean()
      .exec();
    return this.toPrepRateList(docs);
  }
}
