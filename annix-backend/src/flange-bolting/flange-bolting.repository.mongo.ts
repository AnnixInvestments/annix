import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FlangeBolting } from "./entities/flange-bolting.entity";
import { FlangeBoltingMaterial } from "./entities/flange-bolting-material.entity";
import {
  FlangeBoltingMaterialRepository,
  FlangeBoltingRepository,
} from "./flange-bolting.repository";

@Injectable()
export class MongoFlangeBoltingRepository
  extends MongoCrudRepository<FlangeBolting>
  implements FlangeBoltingRepository
{
  constructor(@InjectModel("FlangeBolting") model: Model<FlangeBolting>) {
    super(model);
  }

  async saveMany(entities: FlangeBolting[]): Promise<FlangeBolting[]> {
    const results = await Promise.all(entities.map((entity) => this.save(entity)));
    return results;
  }

  async findAllWithStandard(): Promise<FlangeBolting[]> {
    return this.toDomainList(
      await this.documents.find().sort({ standardId: 1, pressureClass: 1, nps: 1 }).lean().exec(),
    );
  }

  async findByStandardId(standardId: number): Promise<FlangeBolting[]> {
    return this.toDomainList(
      await this.documents.find({ standardId }).sort({ pressureClass: 1, nps: 1 }).lean().exec(),
    );
  }

  async findByStandardAndClass(
    standardId: number,
    pressureClass: string,
  ): Promise<FlangeBolting[]> {
    return this.toDomainList(
      await this.documents.find({ standardId, pressureClass }).sort({ nps: 1 }).lean().exec(),
    );
  }

  async findByStandardClassAndNps(
    standardId: number,
    pressureClass: string,
    nps: string,
  ): Promise<FlangeBolting | null> {
    return this.toDomain(
      await this.documents.findOne({ standardId, pressureClass, nps }).lean().exec(),
    );
  }
}

@Injectable()
export class MongoFlangeBoltingMaterialRepository
  extends MongoCrudRepository<FlangeBoltingMaterial>
  implements FlangeBoltingMaterialRepository
{
  constructor(@InjectModel("FlangeBoltingMaterial") model: Model<FlangeBoltingMaterial>) {
    super(model);
  }

  async findAllOrderedByGroup(): Promise<FlangeBoltingMaterial[]> {
    return this.toDomainList(await this.documents.find().sort({ materialGroup: 1 }).lean().exec());
  }

  async findByMaterialGroup(materialGroup: string): Promise<FlangeBoltingMaterial | null> {
    return this.toDomain(await this.documents.findOne({ materialGroup }).lean().exec());
  }
}
