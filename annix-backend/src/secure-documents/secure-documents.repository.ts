import { CrudRepository } from "../lib/persistence/crud-repository";
import { SecureDocument } from "./secure-document.entity";
import { EntityType, SecureEntityFolder } from "./secure-entity-folder.entity";

export abstract class SecureDocumentRepository extends CrudRepository<SecureDocument> {
  abstract findBySlug(slug: string): Promise<SecureDocument | null>;
  abstract findByFolder(folderPath: string): Promise<SecureDocument[]>;
}

export abstract class SecureEntityFolderRepository extends CrudRepository<SecureEntityFolder> {
  abstract findByEntityTypeAndId(
    entityType: EntityType,
    entityId: number,
  ): Promise<SecureEntityFolder | null>;
  abstract findAllByEntityType(
    entityType?: EntityType,
    activeOnly?: boolean,
  ): Promise<SecureEntityFolder[]>;
  abstract findInactiveExpiredBefore(cutoff: Date): Promise<SecureEntityFolder[]>;
  abstract countInactive(): Promise<number>;
  abstract countInactiveExpiredBefore(cutoff: Date): Promise<number>;
  abstract findOldestInactive(): Promise<SecureEntityFolder | null>;
}
