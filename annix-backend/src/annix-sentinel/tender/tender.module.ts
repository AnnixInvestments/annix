import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelDocument } from "../sentinel-documents/entities/document.entity";
import { AnnixSentinelTenderController } from "./tender.controller";
import { AnnixSentinelTenderService } from "./tender.service";

@Module({
  imports: [TypeOrmModule.forFeature([Company, AnnixSentinelDocument])],
  controllers: [AnnixSentinelTenderController],
  providers: [AnnixSentinelTenderService],
})
export class AnnixSentinelTenderModule {}
