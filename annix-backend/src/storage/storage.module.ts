import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { STORAGE_SERVICE, IStorageService } from './storage.interface';

const logger = new Logger('StorageModule');

/**
 * Factory function to determine which storage service to use based on STORAGE_TYPE environment variable.
 *
 * Usage:
 * - STORAGE_TYPE=local (default) - Uses local filesystem storage
 * - STORAGE_TYPE=s3 - Uses AWS S3 storage
 */
const storageServiceFactory = {
  provide: STORAGE_SERVICE,
  useFactory: (configService: ConfigService, localStorageService: LocalStorageService, s3StorageService: S3StorageService): IStorageService => {
    const storageType = configService.get<string>('STORAGE_TYPE') || 'local';

    logger.log(`Storage type configured: ${storageType}`);

    switch (storageType.toLowerCase()) {
      case 's3':
        logger.log('Using S3 Storage Service');
        return s3StorageService;
      case 'local':
      default:
        logger.log('Using Local Storage Service');
        return localStorageService;
    }
  },
  inject: [ConfigService, LocalStorageService, S3StorageService],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageService,
    S3StorageService,
    storageServiceFactory,
  ],
  exports: [STORAGE_SERVICE, LocalStorageService, S3StorageService],
})
export class StorageModule {}
