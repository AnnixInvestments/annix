import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberDeliveryNoteCorrection } from "../entities/rubber-delivery-note-correction.entity";
import { RubberDeliveryNoteCorrectionRepository } from "./rubber-delivery-note-correction.repository";

@Injectable()
export class MongoRubberDeliveryNoteCorrectionRepository
  extends MongoCrudRepository<RubberDeliveryNoteCorrection>
  implements RubberDeliveryNoteCorrectionRepository
{
  constructor(
    @InjectModel("RubberDeliveryNoteCorrection")
    model: Model<RubberDeliveryNoteCorrection>,
  ) {
    super(model);
  }

  build(data: Partial<RubberDeliveryNoteCorrection>): RubberDeliveryNoteCorrection {
    return data as RubberDeliveryNoteCorrection;
  }

  saveMany(entities: RubberDeliveryNoteCorrection[]): Promise<RubberDeliveryNoteCorrection[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  async findRecentBySupplierName(supplierName: string): Promise<RubberDeliveryNoteCorrection[]> {
    const docs = await this.documents
      .find({ supplierName })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
