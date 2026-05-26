import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberQualityAlert } from "../entities/rubber-quality-alert.entity";
import { RubberQualityAlertRepository } from "./rubber-quality-alert.repository";

@Injectable()
export class MongoRubberQualityAlertRepository
  extends MongoCrudRepository<RubberQualityAlert>
  implements RubberQualityAlertRepository
{
  constructor(@InjectModel("RubberQualityAlert") model: Model<RubberQualityAlert>) {
    super(model);
  }

  build(data: Partial<RubberQualityAlert>): RubberQualityAlert {
    return data as RubberQualityAlert;
  }

  saveMany(entities: RubberQualityAlert[]): Promise<RubberQualityAlert[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  async findActiveOrdered(): Promise<RubberQualityAlert[]> {
    const docs = await this.documents
      .find({ acknowledgedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByCompoundCodeOrdered(compoundCode: string): Promise<RubberQualityAlert[]> {
    const docs = await this.documents
      .find({ compoundCode })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countActiveByCompoundCode(compoundCode: string): Promise<number> {
    return this.documents.countDocuments({ compoundCode, acknowledgedAt: null }).exec();
  }
}
