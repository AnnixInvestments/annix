import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SecureDocument } from "./secure-document.entity";
import {
  SecureDocumentRepository,
  SecureEntityFolderRepository,
} from "./secure-documents.repository";
import { EntityType, SecureEntityFolder } from "./secure-entity-folder.entity";

@Injectable()
export class MongoSecureDocumentRepository
  extends MongoCrudRepository<SecureDocument>
  implements SecureDocumentRepository
{
  constructor(@InjectModel("SecureDocument") model: Model<SecureDocument>) {
    super(model);
  }

  async findBySlug(slug: string): Promise<SecureDocument | null> {
    const document = await this.documents.findOne({ slug }).lean().exec();
    return this.toDomain(document);
  }

  async findByFolder(folderPath: string): Promise<SecureDocument[]> {
    const documents = await this.documents
      .find({ folder: folderPath })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}

@Injectable()
export class MongoSecureEntityFolderRepository
  extends MongoCrudRepository<SecureEntityFolder>
  implements SecureEntityFolderRepository
{
  constructor(@InjectModel("SecureEntityFolder") model: Model<SecureEntityFolder>) {
    super(model);
  }

  async findByEntityTypeAndId(
    entityType: EntityType,
    entityId: number,
  ): Promise<SecureEntityFolder | null> {
    const document = await this.documents.findOne({ entityType, entityId }).lean().exec();
    return this.toDomain(document);
  }

  async findAllByEntityType(
    entityType?: EntityType,
    activeOnly: boolean = true,
  ): Promise<SecureEntityFolder[]> {
    const query: Record<string, unknown> = {};
    if (entityType) {
      query.entityType = entityType;
    }
    if (activeOnly) {
      query.isActive = true;
    }
    const documents = await this.documents.find(query).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findInactiveExpiredBefore(cutoff: Date): Promise<SecureEntityFolder[]> {
    const documents = await this.documents
      .find({ isActive: false, deletedAt: { $lt: cutoff } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  countInactive(): Promise<number> {
    return this.documents.countDocuments({ isActive: false }).exec();
  }

  countInactiveExpiredBefore(cutoff: Date): Promise<number> {
    return this.documents.countDocuments({ isActive: false, deletedAt: { $lt: cutoff } }).exec();
  }

  async findOldestInactive(): Promise<SecureEntityFolder | null> {
    const document = await this.documents
      .findOne({ isActive: false })
      .sort({ deletedAt: 1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }
}
