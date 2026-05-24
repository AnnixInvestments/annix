import { Module } from "@nestjs/common";
import { AnnixSentinelTaxController } from "./tax.controller";
import { AnnixSentinelTaxService } from "./tax.service";

@Module({
  controllers: [AnnixSentinelTaxController],
  providers: [AnnixSentinelTaxService],
  exports: [AnnixSentinelTaxService],
})
export class AnnixSentinelTaxModule {}
