import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { AdminBrandingController } from "./admin-branding.controller";
import { AppBrandingRepository } from "./app-branding.repository";
import { MongoAppBrandingRepository } from "./app-branding.repository.mongo";
import { PostgresAppBrandingRepository } from "./app-branding.repository.postgres";
import { AppBrandingService } from "./app-branding.service";
import { AppBranding } from "./entities/app-branding.entity";
import { AppBrandingImage } from "./entities/app-branding-image.entity";
import { PublicBrandingController } from "./public-branding.controller";
import { AppBrandingSchema } from "./schemas/app-branding.schema";
import { AppBrandingImageSchema } from "./schemas/app-branding-image.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AppBranding", schema: AppBrandingSchema },
            { name: "AppBrandingImage", schema: AppBrandingImageSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([AppBranding, AppBrandingImage])]),
    MulterModule.register({ limits: { fileSize: 2 * 1024 * 1024 } }),
    StorageModule,
    AdminModule,
  ],
  controllers: [AdminBrandingController, PublicBrandingController],
  providers: [
    AppBrandingService,
    repositoryProvider(
      AppBrandingRepository,
      PostgresAppBrandingRepository,
      MongoAppBrandingRepository,
    ),
  ],
  exports: [AppBrandingService],
})
export class BrandingModule {}
