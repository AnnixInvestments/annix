import { forwardRef, Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "../email/email.module";
import { FlangePressureClass } from "../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { SupplierModule } from "../supplier/supplier.module";
import { BoqController } from "./boq.controller";
import { BoqService } from "./boq.service";
import { BoqDistributionService } from "./boq-distribution.service";
import { BoqParserService } from "./boq-parser.service";
import { Boq } from "./entities/boq.entity";
import { BoqLineItem } from "./entities/boq-line-item.entity";
import { BoqSection } from "./entities/boq-section.entity";
import { BoqSupplierAccess } from "./entities/boq-supplier-access.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Boq,
      BoqLineItem,
      BoqSection,
      BoqSupplierAccess,
      Rfq,
      RfqItem,
      FlangeStandard,
      FlangePressureClass,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
    forwardRef(() => SupplierModule),
    EmailModule,
  ],
  controllers: [BoqController],
  providers: [BoqService, BoqParserService, BoqDistributionService],
  exports: [BoqService, BoqDistributionService],
})
export class BoqModule {}
