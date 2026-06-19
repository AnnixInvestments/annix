import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SharedModule } from "../shared/shared.module";
import { CoatingSystemSchema } from "./schemas/coating-system.schema";
import { RfqSurfaceProtectionSchema } from "./schemas/rfq-surface-protection.schema";
import { SpCoatingRateSchema } from "./schemas/sp-coating-rate.schema";
import { SpLiningRateSchema } from "./schemas/sp-lining-rate.schema";
import { SpSurfacePrepRateSchema } from "./schemas/sp-surface-prep-rate.schema";
import { SurfaceProtectionRepository } from "./surface-protection.repository";
import { MongoSurfaceProtectionRepository } from "./surface-protection.repository.mongo";
import { SurfaceProtectionService } from "./surface-protection.service";

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: "CoatingSystem", schema: CoatingSystemSchema },
      { name: "RfqSurfaceProtection", schema: RfqSurfaceProtectionSchema },
      { name: "SpCoatingRate", schema: SpCoatingRateSchema },
      { name: "SpLiningRate", schema: SpLiningRateSchema },
      { name: "SpSurfacePrepRate", schema: SpSurfacePrepRateSchema },
    ]),
  ],
  providers: [
    SurfaceProtectionService,
    repositoryProvider(SurfaceProtectionRepository, MongoSurfaceProtectionRepository),
  ],
  exports: [SurfaceProtectionService],
})
export class SurfaceProtectionModule {}
