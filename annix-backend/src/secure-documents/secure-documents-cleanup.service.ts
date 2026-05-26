import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { now } from "../lib/datetime";
import {
  SecureDocumentRepository,
  SecureEntityFolderRepository,
} from "./secure-documents.repository";
import { SecureDocumentsService } from "./secure-documents.service";
import { SecureEntityFolder } from "./secure-entity-folder.entity";

@Injectable()
export class SecureDocumentsCleanupService {
  private readonly logger = new Logger(SecureDocumentsCleanupService.name);
  private readonly retentionDays = 90;

  constructor(
    private readonly folderRepo: SecureEntityFolderRepository,
    private readonly documentRepo: SecureDocumentRepository,
    private readonly secureDocumentsService: SecureDocumentsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: "secure-docs:cleanup-deleted" })
  async cleanupDeletedFolders(): Promise<void> {
    this.logger.log("Starting scheduled cleanup of deleted entity folders");

    const cutoffDate = now().minus({ days: this.retentionDays }).toJSDate();

    const expiredFolders = await this.folderRepo.findInactiveExpiredBefore(cutoffDate);

    if (expiredFolders.length === 0) {
      this.logger.log("No expired folders to clean up");
      return;
    }

    this.logger.log(`Found ${expiredFolders.length} expired folders to clean up`);

    for (const folder of expiredFolders) {
      try {
        await this.permanentlyDeleteFolder(folder);
        this.logger.log(
          `Permanently deleted folder: ${folder.secureFolderPath} (${folder.entityType} ${folder.entityId})`,
        );
      } catch (error: any) {
        this.logger.error(`Failed to delete folder ${folder.id}: ${error.message}`);
      }
    }

    this.logger.log("Scheduled cleanup completed");
  }

  private async permanentlyDeleteFolder(folder: SecureEntityFolder): Promise<void> {
    const documents = await this.documentRepo.findByFolder(folder.secureFolderPath);

    for (const document of documents) {
      try {
        await this.secureDocumentsService.remove(document.id);
      } catch (error: any) {
        this.logger.warn(`Failed to delete document ${document.id}: ${error.message}`);
      }
    }

    await this.folderRepo.remove(folder);
  }

  async runManualCleanup(): Promise<{
    deletedFolders: number;
    deletedDocuments: number;
  }> {
    this.logger.log("Running manual cleanup of deleted entity folders");

    const cutoffDate = now().minus({ days: this.retentionDays }).toJSDate();

    const expiredFolders = await this.folderRepo.findInactiveExpiredBefore(cutoffDate);

    let deletedFolders = 0;
    let deletedDocuments = 0;

    for (const folder of expiredFolders) {
      const documents = await this.documentRepo.findByFolder(folder.secureFolderPath);

      for (const document of documents) {
        try {
          await this.secureDocumentsService.remove(document.id);
          deletedDocuments++;
        } catch (error: any) {
          this.logger.warn(`Failed to delete document ${document.id}: ${error.message}`);
        }
      }

      try {
        await this.folderRepo.remove(folder);
        deletedFolders++;
      } catch (error: any) {
        this.logger.error(`Failed to delete folder ${folder.id}: ${error.message}`);
      }
    }

    this.logger.log(
      `Manual cleanup completed: ${deletedFolders} folders, ${deletedDocuments} documents deleted`,
    );

    return { deletedFolders, deletedDocuments };
  }

  async cleanupStats(): Promise<{
    totalInactive: number;
    pendingCleanup: number;
    oldestDeletedAt: Date | null;
  }> {
    const cutoffDate = now().minus({ days: this.retentionDays }).toJSDate();

    const totalInactive = await this.folderRepo.countInactive();

    const pendingCleanup = await this.folderRepo.countInactiveExpiredBefore(cutoffDate);

    const oldestFolder = await this.folderRepo.findOldestInactive();

    return {
      totalInactive,
      pendingCleanup,
      oldestDeletedAt: oldestFolder?.deletedAt ?? null,
    };
  }
}
