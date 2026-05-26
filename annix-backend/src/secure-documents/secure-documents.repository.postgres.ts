import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { FindOptionsWhere } from "typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SecureDocument } from "./secure-document.entity";
import {
  SecureDocumentRepository,
  SecureEntityFolderRepository,
} from "./secure-documents.repository";
import { EntityType, SecureEntityFolder } from "./secure-entity-folder.entity";

@Injectable()
export class PostgresSecureDocumentRepository
  extends TypeOrmCrudRepository<SecureDocument>
  implements SecureDocumentRepository
{
  constructor(@InjectRepository(SecureDocument) repository: Repository<SecureDocument>) {
    super(repository);
  }

  findBySlug(slug: string): Promise<SecureDocument | null> {
    return this.repository.findOne({ where: { slug }, relations: ["createdBy"] });
  }

  findByFolder(folderPath: string): Promise<SecureDocument[]> {
    return this.repository.find({
      where: { folder: folderPath },
      relations: ["createdBy"],
      order: { updatedAt: "DESC" },
    });
  }
}

@Injectable()
export class PostgresSecureEntityFolderRepository
  extends TypeOrmCrudRepository<SecureEntityFolder>
  implements SecureEntityFolderRepository
{
  constructor(@InjectRepository(SecureEntityFolder) repository: Repository<SecureEntityFolder>) {
    super(repository);
  }

  findByEntityTypeAndId(
    entityType: EntityType,
    entityId: number,
  ): Promise<SecureEntityFolder | null> {
    return this.repository.findOne({ where: { entityType, entityId } });
  }

  findAllByEntityType(
    entityType?: EntityType,
    activeOnly: boolean = true,
  ): Promise<SecureEntityFolder[]> {
    const where: FindOptionsWhere<SecureEntityFolder> = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (activeOnly) {
      where.isActive = true;
    }
    return this.repository.find({ where, order: { createdAt: "DESC" } });
  }

  findInactiveExpiredBefore(cutoff: Date): Promise<SecureEntityFolder[]> {
    return this.repository.find({
      where: { isActive: false, deletedAt: LessThan(cutoff) },
    });
  }

  countInactive(): Promise<number> {
    return this.repository.count({ where: { isActive: false } });
  }

  countInactiveExpiredBefore(cutoff: Date): Promise<number> {
    return this.repository.count({
      where: { isActive: false, deletedAt: LessThan(cutoff) },
    });
  }

  findOldestInactive(): Promise<SecureEntityFolder | null> {
    return this.repository.findOne({
      where: { isActive: false },
      order: { deletedAt: "ASC" },
    });
  }
}
