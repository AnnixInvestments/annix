import { forwardRef, Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoltMass } from "../bolt-mass/entities/bolt-mass.entity";
import { Boq } from "../boq/entities/boq.entity";
import { BoqSupplierAccess } from "../boq/entities/boq-supplier-access.entity";
import { CustomerModule } from "../customer/customer.module";
import { EmailModule } from "../email/email.module";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { FlangePressureClass } from "../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { NbNpsLookup } from "../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { NutMass } from "../nut-mass/entities/nut-mass.entity";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { User } from "../user/entities/user.entity";
import { AnonymousDraftController } from "./anonymous-draft.controller";
import { AnonymousDraftService } from "./anonymous-draft.service";
import { AnonymousDraft } from "./entities/anonymous-draft.entity";
import { BendRfq } from "./entities/bend-rfq.entity";
import { ExpansionJointRfq } from "./entities/expansion-joint-rfq.entity";
import { FittingRfq } from "./entities/fitting-rfq.entity";
import { InstrumentRfq } from "./entities/instrument-rfq.entity";
import { PumpRfq } from "./entities/pump-rfq.entity";
import { Rfq } from "./entities/rfq.entity";
import { RfqDocument } from "./entities/rfq-document.entity";
import { RfqDraft } from "./entities/rfq-draft.entity";
import { RfqItem } from "./entities/rfq-item.entity";
import { RfqSequence } from "./entities/rfq-sequence.entity";
import { StraightPipeRfq } from "./entities/straight-pipe-rfq.entity";
import { ValveRfq } from "./entities/valve-rfq.entity";
import { RfqController } from "./rfq.controller";
import { RfqService } from "./rfq.service";
import { ReferenceDataCacheService } from "./services/reference-data-cache.service";

@Module({
  imports: [
    forwardRef(() => CustomerModule),
    EmailModule,
    TypeOrmModule.forFeature([
      Rfq,
      RfqItem,
      StraightPipeRfq,
      BendRfq,
      FittingRfq,
      ExpansionJointRfq,
      ValveRfq,
      InstrumentRfq,
      PumpRfq,
      RfqDocument,
      RfqDraft,
      AnonymousDraft,
      RfqSequence,
      User,
      SteelSpecification,
      PipeDimension,
      FlangeStandard,
      FlangePressureClass,
      FlangeDimension,
      BoltMass,
      NutMass,
      NbNpsLookup,
      Boq,
      BoqSupplierAccess,
      SupplierProfile,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
      },
    }),
  ],
  controllers: [RfqController, AnonymousDraftController],
  providers: [RfqService, AnonymousDraftService, ReferenceDataCacheService],
  exports: [RfqService, AnonymousDraftService, ReferenceDataCacheService],
})
export class RfqModule {}
