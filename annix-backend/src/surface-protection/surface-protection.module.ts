import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoatingSystem } from "./entities/coating-system.entity";
import { RfqSurfaceProtection } from "./entities/rfq-surface-protection.entity";
import { SpCoatingRate } from "./entities/sp-coating-rate.entity";
import { SpLiningRate } from "./entities/sp-lining-rate.entity";
import { SpSurfacePrepRate } from "./entities/sp-surface-prep-rate.entity";
import { SurfaceProtectionService } from "./surface-protection.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoatingSystem,
      RfqSurfaceProtection,
      SpCoatingRate,
      SpLiningRate,
      SpSurfacePrepRate,
    ]),
  ],
  providers: [SurfaceProtectionService],
  exports: [SurfaceProtectionService],
})
export class SurfaceProtectionModule {}
