import { Module } from "@nestjs/common";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelTenderController } from "./tender.controller";
import { AnnixSentinelTenderService } from "./tender.service";

@Module({
  imports: [AnnixSentinelDocumentsModule],
  controllers: [AnnixSentinelTenderController],
  providers: [AnnixSentinelTenderService],
})
export class AnnixSentinelTenderModule {}
