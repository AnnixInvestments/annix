import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DispatchLoadPhoto } from "../entities/dispatch-load-photo.entity";
import { DispatchLoadPhotoRepository } from "./dispatch-load-photo.repository";

@Injectable()
export class MongoDispatchLoadPhotoRepository
  extends MongoCrudRepository<DispatchLoadPhoto>
  implements DispatchLoadPhotoRepository
{
  constructor(@InjectModel("DispatchLoadPhoto") model: Model<DispatchLoadPhoto>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<DispatchLoadPhoto[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(photoId: number, companyId: number): Promise<DispatchLoadPhoto | null> {
    const doc = await this.documents.findOne({ _id: photoId, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
