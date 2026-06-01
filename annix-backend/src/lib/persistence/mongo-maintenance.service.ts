import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import type { Connection } from "mongoose";
import {
  cleanupEmptyCollections,
  type EmptyCollectionCleanupResult,
} from "./empty-collection-cleanup";

@Injectable()
export class MongoMaintenanceService {
  private readonly logger = new Logger(MongoMaintenanceService.name);

  constructor(
    @Optional() @InjectConnection() private readonly connection: Connection | null = null,
  ) {}

  @Cron("0 3 * * *", { name: "maintenance:drop-empty-collections" })
  async dropEmptyCollectionsScheduled(): Promise<void> {
    if (!this.connection) {
      this.logger.log("No Mongo connection present; skipping empty-collection cleanup");
      return;
    }

    const result = await this.dropEmptyCollections();
    this.logger.log(
      `Empty-collection cleanup: scanned ${result.scanned}, empty ${result.empty}, dropped ${result.dropped.length}, kept-with-indexes ${result.keptWithIndexes.length}, failed ${result.failed.length}`,
    );
  }

  async dropEmptyCollections(): Promise<EmptyCollectionCleanupResult> {
    if (!this.connection) {
      return { scanned: 0, empty: 0, droppable: [], dropped: [], keptWithIndexes: [], failed: [] };
    }
    return cleanupEmptyCollections(this.connection, { apply: true });
  }
}
