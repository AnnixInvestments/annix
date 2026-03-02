import { Global, Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LocalStorageService } from "./local-storage.service";
import { S3StorageService } from "./s3-storage.service";
import { IStorageService, STORAGE_SERVICE } from "./storage.interface";

const logger = new Logger("StorageModule");

const storageServiceFactory = {
  provide: STORAGE_SERVICE,
  useFactory: (
    configService: ConfigService,
    localStorageService: LocalStorageService,
    s3StorageService: S3StorageService,
  ): IStorageService => {
    const storageType = configService.get<string>("STORAGE_TYPE") || "s3";

    logger.log(`Storage type configured: ${storageType}`);

    if (storageType.toLowerCase() === "local") {
      logger.warn(
        "Local storage is deprecated for production use. " +
          "Files stored locally will be lost on redeployment. " +
          "Set STORAGE_TYPE=s3 for production environments.",
      );
      return localStorageService;
    }

    logger.log("Using S3 Storage Service");
    return s3StorageService;
  },
  inject: [ConfigService, LocalStorageService, S3StorageService],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LocalStorageService, S3StorageService, storageServiceFactory],
  exports: [STORAGE_SERVICE, LocalStorageService, S3StorageService],
})
export class StorageModule {}
