import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelTenderController } from "./tender.controller";
import { AnnixSentinelTenderService } from "./tender.service";

@Module({
  imports: [TypeOrmModule.forFeature([Company]), AnnixSentinelDocumentsModule],
  controllers: [AnnixSentinelTenderController],
  providers: [AnnixSentinelTenderService],
})
export class AnnixSentinelTenderModule {}
