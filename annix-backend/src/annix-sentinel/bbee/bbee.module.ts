import { Module } from "@nestjs/common";
import { AnnixSentinelBbeeController } from "./bbee.controller";
import { AnnixSentinelBbeeService } from "./bbee.service";

@Module({
  controllers: [AnnixSentinelBbeeController],
  providers: [AnnixSentinelBbeeService],
  exports: [AnnixSentinelBbeeService],
})
export class AnnixSentinelBbeeModule {}
