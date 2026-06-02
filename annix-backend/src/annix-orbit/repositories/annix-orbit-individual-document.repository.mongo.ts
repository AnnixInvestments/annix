import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  AnnixOrbitIndividualDocument,
  IndividualDocumentKind,
} from "../entities/annix-orbit-individual-document.entity";
import { AnnixOrbitIndividualDocumentRepository } from "./annix-orbit-individual-document.repository";

@Injectable()
export class MongoAnnixOrbitIndividualDocumentRepository
  extends MongoCrudRepository<AnnixOrbitIndividualDocument>
  implements AnnixOrbitIndividualDocumentRepository
{
  constructor(
    @InjectModel("AnnixOrbitIndividualDocument", ORBIT_CONNECTION)
    model: Model<AnnixOrbitIndividualDocument>,
  ) {
    super(model);
  }

  async findByProfile(profileId: number): Promise<AnnixOrbitIndividualDocument[]> {
    const docs = await this.documents.find({ profileId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByProfileOrdered(profileId: number): Promise<AnnixOrbitIndividualDocument[]> {
    const docs = await this.documents.find({ profileId }).sort({ uploadedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByProfileAndKind(
    profileId: number,
    kind: IndividualDocumentKind,
  ): Promise<AnnixOrbitIndividualDocument | null> {
    const doc = await this.documents.findOne({ profileId, kind }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdForProfile(
    documentId: number,
    profileId: number,
  ): Promise<AnnixOrbitIndividualDocument | null> {
    const doc = await this.documents.findOne({ _id: documentId, profileId }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteById(documentId: number): Promise<void> {
    await this.documents.findByIdAndDelete(documentId).exec();
  }

  async deleteByProfile(profileId: number): Promise<void> {
    await this.documents.deleteMany({ profileId }).exec();
  }
}
