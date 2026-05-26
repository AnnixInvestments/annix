import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { SteelSpecification } from "src/steel-specification/entities/steel-specification.entity";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PipeDimension } from "./entities/pipe-dimension.entity";
import { PipeDimensionRepository } from "./pipe-dimension.repository";

@Injectable()
export class MongoPipeDimensionRepository
  extends MongoCrudRepository<PipeDimension>
  implements PipeDimensionRepository
{
  constructor(@InjectModel("PipeDimension") model: Model<PipeDimension>) {
    super(model);
  }

  private get nominalModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("NominalOutsideDiameterMm");
  }

  private get steelModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("SteelSpecification");
  }

  private get pressureModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("PipePressure");
  }

  async findAllWithRelations(): Promise<PipeDimension[]> {
    const docs = await this.documents.find().lean().exec();
    return this.toDomainList(docs);
  }

  async findAllWithDiameterAndSpec(): Promise<PipeDimension[]> {
    const docs = await this.documents
      .find()
      .populate(["nominalOutsideDiameter", "steelSpecification"])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneWithRelations(id: number): Promise<PipeDimension | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findNominalByDiameter(nominalDiameterMm: number): Promise<NominalOutsideDiameterMm | null> {
    const doc = await this.nominalModel
      .findOne({ nominal_diameter_mm: nominalDiameterMm })
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as NominalOutsideDiameterMm;
  }

  async findNominalById(id: number): Promise<NominalOutsideDiameterMm | null> {
    const doc = await this.nominalModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as NominalOutsideDiameterMm;
  }

  async findSteelById(id: number): Promise<SteelSpecification | null> {
    const doc = await this.steelModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as SteelSpecification;
  }

  async createPipe(data: Partial<PipeDimension>): Promise<PipeDimension> {
    return this.create(data);
  }

  async savePipe(entity: PipeDimension): Promise<PipeDimension> {
    return this.save(entity);
  }

  async removePipe(entity: PipeDimension): Promise<void> {
    return this.remove(entity);
  }

  async findBySpecAndNominal(steelSpecId: number, nominalId: number): Promise<PipeDimension[]> {
    const docs = await this.documents
      .find({ steelSpecificationId: steelSpecId, nominalOutsideDiameterId: nominalId })
      .sort({ wall_thickness_mm: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async recommendedSpecs(
    nominalId: number,
    workingPressureMpa: number,
    temperature: number,
    steelSpecId?: number,
  ): Promise<PipeDimension[]> {
    const pipeDocs = await this.documents
      .find(this.buildNominalSteelFilter(nominalId, steelSpecId))
      .lean()
      .exec();
    const pipeIds = pipeDocs.map((p) => p["_id"]);
    const matchingPressures = await this.pressureModel
      .find({
        pipeDimensionId: { $in: pipeIds },
        temperature_c: { $ne: null, $gte: temperature },
        max_working_pressure_mpa: { $ne: null, $gte: workingPressureMpa },
      })
      .lean()
      .exec();
    const matchingPipeIds = new Set(matchingPressures.map((p) => p["pipeDimensionId"]));
    const filtered = pipeDocs.filter((p) => matchingPipeIds.has(p["_id"]));
    return this.toDomainList(filtered);
  }

  async higherSchedules(
    nominalId: number,
    currentWallThickness: number,
    workingPressureMpa: number,
    temperature: number,
    steelSpecId?: number,
  ): Promise<PipeDimension[]> {
    const baseFilter = this.buildNominalSteelFilter(nominalId, steelSpecId);
    const pipeDocs = await this.documents
      .find({ ...baseFilter, wall_thickness_mm: { $gt: currentWallThickness } })
      .lean()
      .exec();
    const pipeIds = pipeDocs.map((p) => p["_id"]);
    const matchingPressures = await this.pressureModel
      .find({
        pipeDimensionId: { $in: pipeIds },
        temperature_c: { $ne: null, $gte: temperature },
        max_working_pressure_mpa: { $ne: null, $gte: workingPressureMpa },
      })
      .lean()
      .exec();
    const matchingPipeIds = new Set(matchingPressures.map((p) => p["pipeDimensionId"]));
    const filtered = pipeDocs.filter((p) => matchingPipeIds.has(p["_id"]));
    return this.toDomainList(filtered);
  }

  private buildNominalSteelFilter(
    nominalId: number,
    steelSpecId?: number,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = { nominalOutsideDiameterId: nominalId };
    if (steelSpecId) {
      filter["steelSpecificationId"] = steelSpecId;
    }
    return filter;
  }

  async findByNominalDiameterScheduleAndSteel(
    nominalDiameterMm: number,
    scheduleDesignation: string,
    steelSpecId?: number,
  ): Promise<PipeDimension | null> {
    const nominal = await this.nominalModel
      .findOne({ nominal_diameter_mm: nominalDiameterMm })
      .lean()
      .exec();
    if (!nominal) return null;
    const filter: Record<string, unknown> = {
      nominalOutsideDiameterId: nominal._id,
      schedule_designation: scheduleDesignation,
    };
    if (steelSpecId) {
      filter["steelSpecificationId"] = steelSpecId;
    }
    const doc = await this.documents.findOne(filter).lean().exec();
    return this.toDomain(doc);
  }
}
