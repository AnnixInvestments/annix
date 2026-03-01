import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { CvAssistantModule } from "../cv-assistant/cv-assistant.module";
import { AnnixRepModule } from "../fieldflow/fieldflow.module";
import { MinesModule } from "../mines/mines.module";
import { NixModule } from "../nix/nix.module";
import { PumpOrderModule } from "../pump-order/pump-order.module";
import { PumpProductModule } from "../pump-product/pump-product.module";
import { RubberLiningModule } from "../rubber-lining/rubber-lining.module";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { StockControlModule } from "../stock-control/stock-control.module";
import { SurfaceProtectionModule } from "../surface-protection/surface-protection.module";
import { ThermalModule } from "../thermal/thermal.module";

@Module({
  imports: [
    RubberLiningModule,
    StockControlModule,
    AnnixRepModule,
    CvAssistantModule,
    AdminModule,
    PumpProductModule,
    PumpOrderModule,
    MinesModule,
    ThermalModule,
    NixModule,
    SecureDocumentsModule,
    SurfaceProtectionModule,
  ],
  exports: [
    RubberLiningModule,
    StockControlModule,
    AnnixRepModule,
    CvAssistantModule,
    AdminModule,
    PumpProductModule,
    PumpOrderModule,
    MinesModule,
    ThermalModule,
    NixModule,
    SecureDocumentsModule,
    SurfaceProtectionModule,
  ],
})
export class HeavyFeaturesModule {}
