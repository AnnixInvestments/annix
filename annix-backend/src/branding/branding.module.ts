import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { AdminModule } from "../admin/admin.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { AdminBrandingController } from "./admin-branding.controller";
import { AppBrandingRepository } from "./app-branding.repository";
import { MongoAppBrandingRepository } from "./app-branding.repository.mongo";
import { AppBrandingService } from "./app-branding.service";
import { PublicBrandingController } from "./public-branding.controller";
import { AppBrandingSchema } from "./schemas/app-branding.schema";
import { AppBrandingImageSchema } from "./schemas/app-branding-image.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AppBranding", schema: AppBrandingSchema },
      { name: "AppBrandingImage", schema: AppBrandingImageSchema },
    ]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    StorageModule,
    AdminModule,
  ],
  controllers: [AdminBrandingController, PublicBrandingController],
  providers: [
    AppBrandingService,
    repositoryProvider(AppBrandingRepository, MongoAppBrandingRepository),
  ],
  exports: [AppBrandingService],
})
export class BrandingModule {}
