import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SharedModule } from "../shared/shared.module";
import { CoatingSystem } from "./entities/coating-system.entity";
import { RfqSurfaceProtection } from "./entities/rfq-surface-protection.entity";
import { SpCoatingRate } from "./entities/sp-coating-rate.entity";
import { SpLiningRate } from "./entities/sp-lining-rate.entity";
import { SpSurfacePrepRate } from "./entities/sp-surface-prep-rate.entity";
import { CoatingSystemSchema } from "./schemas/coating-system.schema";
import { RfqSurfaceProtectionSchema } from "./schemas/rfq-surface-protection.schema";
import { SpCoatingRateSchema } from "./schemas/sp-coating-rate.schema";
import { SpLiningRateSchema } from "./schemas/sp-lining-rate.schema";
import { SpSurfacePrepRateSchema } from "./schemas/sp-surface-prep-rate.schema";
import { SurfaceProtectionRepository } from "./surface-protection.repository";
import { MongoSurfaceProtectionRepository } from "./surface-protection.repository.mongo";
import { PostgresSurfaceProtectionRepository } from "./surface-protection.repository.postgres";
import { SurfaceProtectionService } from "./surface-protection.service";

@Module({
  imports: [
    SharedModule,
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "CoatingSystem", schema: CoatingSystemSchema },
            { name: "RfqSurfaceProtection", schema: RfqSurfaceProtectionSchema },
            { name: "SpCoatingRate", schema: SpCoatingRateSchema },
            { name: "SpLiningRate", schema: SpLiningRateSchema },
            { name: "SpSurfacePrepRate", schema: SpSurfacePrepRateSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            CoatingSystem,
            RfqSurfaceProtection,
            SpCoatingRate,
            SpLiningRate,
            SpSurfacePrepRate,
          ]),
        ]),
  ],
  providers: [
    SurfaceProtectionService,
    repositoryProvider(
      SurfaceProtectionRepository,
      PostgresSurfaceProtectionRepository,
      MongoSurfaceProtectionRepository,
    ),
  ],
  exports: [SurfaceProtectionService],
})
export class SurfaceProtectionModule {}
