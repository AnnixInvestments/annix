import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Boq } from './entities/boq.entity';
import { BoqLineItem } from './entities/boq-line-item.entity';
import { BoqSection } from './entities/boq-section.entity';
import { BoqSupplierAccess } from './entities/boq-supplier-access.entity';
import { BoqController } from './boq.controller';
import { BoqService } from './boq.service';
import { BoqParserService } from './boq-parser.service';
import { BoqDistributionService } from './boq-distribution.service';
import { SupplierModule } from '../supplier/supplier.module';
import { EmailModule } from '../email/email.module';
import { Rfq } from '../rfq/entities/rfq.entity';
import { RfqItem } from '../rfq/entities/rfq-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Boq, BoqLineItem, BoqSection, BoqSupplierAccess, Rfq, RfqItem]),
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
