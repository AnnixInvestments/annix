import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { StorageModule } from "../storage/storage.module";
import { AdminBrandingController } from "./admin-branding.controller";
import { AppBrandingService } from "./app-branding.service";
import { AppBranding } from "./entities/app-branding.entity";
import { AppBrandingImage } from "./entities/app-branding-image.entity";
import { PublicBrandingController } from "./public-branding.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([AppBranding, AppBrandingImage]),
    MulterModule.register({ limits: { fileSize: 2 * 1024 * 1024 } }),
    StorageModule,
    AdminModule,
  ],
  controllers: [AdminBrandingController, PublicBrandingController],
  providers: [AppBrandingService],
  exports: [AppBrandingService],
})
export class BrandingModule {}
